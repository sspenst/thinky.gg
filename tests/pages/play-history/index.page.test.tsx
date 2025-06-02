import TestId from '@root/constants/testId';
import { logger } from '@root/helpers/logger';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import { getServerSideProps } from '../../../pages/[subdomain]/play-history/index';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/[subdomain]/play-history', () => {
  const mockReq = {
    headers: {
      host: 'localhost:3000',
    },
  };

  describe('getServerSideProps', () => {
    test('HAPPY PATH: Authenticated user accessing play history page', async () => {
      // User wants to view their play history - they should get access to the page
      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER), // Valid authenticated user
          },
        },
        resolvedUrl: '/play-history',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.reqUser).toBeDefined();
      expect((result as any).props.reqUser._id).toBe(TestId.USER);
      expect((result as any).props.reqUser.name).toBe('test');

      // In the actual page component, this would:
      // 1. Check if user is pro with isPro(reqUser)
      // 2. Show PlayHistory component for pro users
      // 3. Show upgrade message for non-pro users
    });

    test('getServerSideProps with no token should redirect to login with return URL', async () => {
      const context = {
        req: mockReq,
        resolvedUrl: '/play-history',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login?redirect=' + encodeURIComponent('/play-history'),
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
        resolvedUrl: '/play-history',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login?redirect=' + encodeURIComponent('/play-history'),
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

    test('getServerSideProps should work for pathology game subdomain', async () => {
      // This test reflects the actual behavior - pathology is a valid game, so it returns props
      const context = {
        req: {
          headers: {
            host: 'pathology.localhost:3000',
          },
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        resolvedUrl: '/play-history',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.reqUser).toBeDefined();
    });

    test('getServerSideProps should work with different game subdomains', async () => {
      const context = {
        req: {
          headers: {
            host: 'sokoban.localhost:3000',
          },
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        resolvedUrl: '/play-history',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.reqUser).toBeDefined();
    });

    test('getServerSideProps should serialize user data properly', async () => {
      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        resolvedUrl: '/play-history',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');

      // Verify the user data is properly serialized (no ObjectId instances, etc.)
      const userString = JSON.stringify((result as any).props.reqUser);
      const parsedUser = JSON.parse(userString);

      expect(parsedUser._id).toBe(TestId.USER);
      expect(parsedUser.name).toBe('test');
      expect(typeof parsedUser._id).toBe('string');
    });

    test('getServerSideProps should handle empty cookies gracefully', async () => {
      const context = {
        req: {
          ...mockReq,
          cookies: {},
        },
        resolvedUrl: '/play-history',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login?redirect=' + encodeURIComponent('/play-history'),
          permanent: false,
        },
      });
    });

    test('getServerSideProps should handle null cookies gracefully', async () => {
      const context = {
        req: {
          ...mockReq,
          cookies: null,
        },
        resolvedUrl: '/play-history',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login?redirect=' + encodeURIComponent('/play-history'),
          permanent: false,
        },
      });
    });
  });
});
