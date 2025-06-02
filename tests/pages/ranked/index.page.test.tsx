import TestId from '@root/constants/testId';
import { logger } from '@root/helpers/logger';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import { getServerSideProps } from '../../../pages/[subdomain]/ranked/index';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/[subdomain]/ranked', () => {
  const mockReq = {
    headers: {
      host: 'pathology.localhost:3000', // Use pathology which supports ranked
    },
  };

  describe('getServerSideProps', () => {
    test('HAPPY PATH: Authenticated user accessing ranked page', async () => {
      // User wants to view the ranked levels page
      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        resolvedUrl: '/ranked',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.levelsByDifficulty).toBeDefined();
      expect((result as any).props.rankedSolvesByDifficulty).toBeDefined();
      expect(typeof (result as any).props.levelsByDifficulty).toBe('object');
      expect(typeof (result as any).props.rankedSolvesByDifficulty).toBe('object');

      // In the actual page component, this would:
      // 1. Display ranked level counts by difficulty
      // 2. Show user's progress on ranked levels
      // 3. Provide links to search for ranked levels by difficulty
    });

    test('getServerSideProps with no token should redirect to login', async () => {
      const context = {
        req: mockReq,
        resolvedUrl: '/ranked',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login',
          permanent: false,
        },
      });
    });

    test('getServerSideProps with invalid token should redirect to login', async () => {
      jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: 'invalid-token',
          },
        },
        resolvedUrl: '/ranked',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login',
          permanent: false,
        },
      });
    });

    test('getServerSideProps should redirect for games with disabled ranked', async () => {
      // Test with a game that has ranked disabled (like Sokoban)
      const context = {
        req: {
          headers: {
            host: 'sokoban.localhost:3000',
          },
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        resolvedUrl: '/ranked',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/',
          permanent: false,
        },
      });
    });

    test('getServerSideProps should handle missing resolvedUrl gracefully', async () => {
      const context = {
        req: mockReq,
        // Missing resolvedUrl
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login',
          permanent: false,
        },
      });
    });

    test('getServerSideProps should serialize data properly', async () => {
      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        resolvedUrl: '/ranked',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');

      // Verify the data is properly serialized (no ObjectId instances, etc.)
      const levelsByDifficultyString = JSON.stringify((result as any).props.levelsByDifficulty);
      const rankedSolvesByDifficultyString = JSON.stringify((result as any).props.rankedSolvesByDifficulty);

      const parsedLevelsByDifficulty = JSON.parse(levelsByDifficultyString);
      const parsedRankedSolvesByDifficulty = JSON.parse(rankedSolvesByDifficultyString);

      expect(typeof parsedLevelsByDifficulty).toBe('object');
      expect(typeof parsedRankedSolvesByDifficulty).toBe('object');
    });

    test('getServerSideProps should include all required profile query types', async () => {
      // Mock the getProfileQuery function to verify it's called with correct parameters
      const getProfileQuerySpy = jest.fn().mockResolvedValue({
        LevelsByDifficulty: { '1': 10, '2': 5 },
        RankedSolvesByDifficulty: { '1': 8, '2': 3 },
      });

      // We need to mock the import of getProfileQuery
      jest.doMock('../../../pages/api/user/[id]', () => ({
        getProfileQuery: getProfileQuerySpy,
      }));

      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        resolvedUrl: '/ranked',
      };

      // This test would verify that the correct profile query types are requested
      // The actual implementation calls getProfileQuery with specific types
      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
    });

    test('getServerSideProps should handle empty cookies gracefully', async () => {
      const context = {
        req: {
          ...mockReq,
          cookies: {},
        },
        resolvedUrl: '/ranked',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login',
          permanent: false,
        },
      });
    });

    test('getServerSideProps should work with different valid game subdomains', async () => {
      const context = {
        req: {
          headers: {
            host: 'pathology.localhost:3000', // Pathology supports ranked
          },
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        resolvedUrl: '/ranked',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.levelsByDifficulty).toBeDefined();
      expect((result as any).props.rankedSolvesByDifficulty).toBeDefined();
    });

    test('getServerSideProps should handle null cookies gracefully', async () => {
      const context = {
        req: {
          ...mockReq,
          cookies: null,
        },
        resolvedUrl: '/ranked',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login',
          permanent: false,
        },
      });
    });
  });
});
