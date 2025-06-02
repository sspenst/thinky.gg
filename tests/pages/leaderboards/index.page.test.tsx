import TestId from '@root/constants/testId';
import { logger } from '@root/helpers/logger';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import { getServerSideProps } from '../../../pages/[subdomain]/leaderboards/index';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/[subdomain]/leaderboards', () => {
  const mockReq = {
    headers: {
      host: 'pathology.localhost:3000', // Use pathology which supports ranked
    },
  };

  describe('getServerSideProps', () => {
    test('HAPPY PATH: Accessing leaderboards page', async () => {
      // User wants to view the leaderboards
      const context = {
        req: mockReq,
        resolvedUrl: '/leaderboards',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.gmLeaderboard).toBeDefined();
      expect((result as any).props.sgmLeaderboard).toBeDefined();
      expect((result as any).props.rankedLeaderboard).toBeDefined();
      expect((result as any).props.reqUser).toBe(null); // No user authenticated

      // Verify arrays are returned
      expect(Array.isArray((result as any).props.gmLeaderboard)).toBe(true);
      expect(Array.isArray((result as any).props.sgmLeaderboard)).toBe(true);

      // In the actual page component, this would:
      // 1. Display GM (Golden Master) leaderboard
      // 2. Display SGM (Super Golden Master) leaderboard
      // 3. Display ranked leaderboard if not disabled
      // 4. Show user's position if authenticated
    });

    test('getServerSideProps with authenticated user should include user data', async () => {
      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        resolvedUrl: '/leaderboards',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.gmLeaderboard).toBeDefined();
      expect((result as any).props.sgmLeaderboard).toBeDefined();
      expect((result as any).props.rankedLeaderboard).toBeDefined();
      expect((result as any).props.reqUser).not.toBe(null); // User is authenticated
      expect((result as any).props.reqUser._id).toBe(TestId.USER);
    });

    test('getServerSideProps with invalid token should still show leaderboards', async () => {
      jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: 'invalid-token',
          },
        },
        resolvedUrl: '/leaderboards',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.gmLeaderboard).toBeDefined();
      expect((result as any).props.sgmLeaderboard).toBeDefined();
      expect((result as any).props.rankedLeaderboard).toBeDefined();
      expect((result as any).props.reqUser).toBe(null); // Invalid token = null user
    });

    test('getServerSideProps should handle games with disabled ranked', async () => {
      // Test with a game that has ranked disabled (like Sokoban)
      const context = {
        req: {
          headers: {
            host: 'sokoban.localhost:3000',
          },
        },
        resolvedUrl: '/leaderboards',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.gmLeaderboard).toBeDefined();
      expect((result as any).props.sgmLeaderboard).toBeDefined();
      expect((result as any).props.rankedLeaderboard).toBe(null); // Ranked disabled
      expect((result as any).props.reqUser).toBe(null);
    });

    test('getServerSideProps should serialize data properly', async () => {
      const context = {
        req: mockReq,
        resolvedUrl: '/leaderboards',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');

      // Verify the data is properly serialized (no ObjectId instances, etc.)
      const gmLeaderboardString = JSON.stringify((result as any).props.gmLeaderboard);
      const sgmLeaderboardString = JSON.stringify((result as any).props.sgmLeaderboard);

      const parsedGmLeaderboard = JSON.parse(gmLeaderboardString);
      const parsedSgmLeaderboard = JSON.parse(sgmLeaderboardString);

      expect(Array.isArray(parsedGmLeaderboard)).toBe(true);
      expect(Array.isArray(parsedSgmLeaderboard)).toBe(true);
    });

    test('getServerSideProps should handle leaderboard aggregation data structure', async () => {
      const context = {
        req: mockReq,
        resolvedUrl: '/leaderboards',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');

      const gmLeaderboard = (result as any).props.gmLeaderboard;
      const sgmLeaderboard = (result as any).props.sgmLeaderboard;

      // Each leaderboard entry should have user and sum
      if (gmLeaderboard.length > 0) {
        expect(gmLeaderboard[0]).toHaveProperty('user');
        expect(gmLeaderboard[0]).toHaveProperty('sum');
        expect(typeof gmLeaderboard[0].sum).toBe('number');
      }

      if (sgmLeaderboard.length > 0) {
        expect(sgmLeaderboard[0]).toHaveProperty('user');
        expect(sgmLeaderboard[0]).toHaveProperty('sum');
        expect(typeof sgmLeaderboard[0].sum).toBe('number');
      }
    });

    test('getServerSideProps should handle ranked leaderboard when enabled', async () => {
      const context = {
        req: {
          headers: {
            host: 'pathology.localhost:3000', // Pathology has ranked enabled
          },
        },
        resolvedUrl: '/leaderboards',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.rankedLeaderboard).not.toBe(null);

      if ((result as any).props.rankedLeaderboard) {
        expect(Array.isArray((result as any).props.rankedLeaderboard)).toBe(true);
      }
    });

    test('getServerSideProps should handle empty cookies gracefully', async () => {
      const context = {
        req: {
          ...mockReq,
          cookies: {},
        },
        resolvedUrl: '/leaderboards',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.gmLeaderboard).toBeDefined();
      expect((result as any).props.sgmLeaderboard).toBeDefined();
      expect((result as any).props.reqUser).toBe(null);
    });

    test('getServerSideProps should handle null cookies gracefully', async () => {
      const context = {
        req: {
          ...mockReq,
          cookies: null,
        },
        resolvedUrl: '/leaderboards',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.gmLeaderboard).toBeDefined();
      expect((result as any).props.sgmLeaderboard).toBeDefined();
      expect((result as any).props.reqUser).toBe(null);
    });

    test('getServerSideProps should work with different game subdomains', async () => {
      const context = {
        req: {
          headers: {
            host: 'thinky.localhost:3000',
          },
        },
        resolvedUrl: '/leaderboards',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.gmLeaderboard).toBeDefined();
      expect((result as any).props.sgmLeaderboard).toBeDefined();
    });
  });
});
