import TestId from '@root/constants/testId';
import { logger } from '@root/helpers/logger';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import { getServerSideProps } from '../../../pages/[subdomain]/confirm-email/index';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/[subdomain]/confirm-email', () => {
  const mockReq = {
    headers: {
      host: 'localhost:3000',
    },
  };

  describe('getServerSideProps', () => {
    test('HAPPY PATH: Authenticated user accessing confirmation waiting page', async () => {
      // Simulate a user who just signed up and is waiting for email confirmation
      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER), // Valid authenticated user
          },
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      // Happy path: User is authenticated and gets access to the waiting page
      expect(result).toEqual({
        props: {}, // Empty props means user can access the page
      });

      // In the actual page component, this would:
      // 1. Show "waiting for email confirmation" message
      // 2. Poll every 3 seconds to check if email is confirmed
      // 3. Redirect to tutorial or play page once confirmed
    });

    test('getServerSideProps with no token should redirect to home', async () => {
      const context = {
        req: mockReq,
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/',
          permanent: false,
        },
      });
    });

    test('getServerSideProps with valid token should return empty props', async () => {
      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        props: {},
      });
    });

    test('getServerSideProps with invalid token should redirect to home', async () => {
      jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: 'invalid-token',
          },
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/',
          permanent: false,
        },
      });
    });
  });
});
