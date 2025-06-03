import TestId from '@root/constants/testId';
import { logger } from '@root/helpers/logger';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import { getServerSideProps } from '../../../pages/[subdomain]/pro/index';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/[subdomain]/pro', () => {
  const mockReq = {
    headers: {
      host: 'thinky.localhost:3000',
    },
  };

  describe('getServerSideProps', () => {
    test('HAPPY PATH: Authenticated user accessing Thinky pro page', async () => {
      // User wants to view the pro subscription page on Thinky
      const context = {
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        resolvedUrl: '/pro',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect((result as any).props.stripeCustomerPortalLink).toBeDefined();
      expect((result as any).props.stripePaymentLink).toBeDefined();
      expect((result as any).props.stripePaymentYearlyLink).toBeDefined();

      // In the actual page component, this would:
      // 1. Show SettingsPro component with Stripe payment links
      // 2. Allow user to subscribe or manage their subscription
    });

    test('getServerSideProps with no token should redirect to login with return URL', async () => {
      const context = {
        req: mockReq,
        resolvedUrl: '/pro',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login?redirect=' + encodeURIComponent('/pro'),
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
        resolvedUrl: '/pro',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login?redirect=' + encodeURIComponent('/pro'),
          permanent: false,
        },
      });
    });

    test('getServerSideProps should redirect non-Thinky games to Thinky pro page', async () => {
      const context = {
        req: {
          headers: {
            host: 'pathology.localhost:3000', // Different game
          },
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        resolvedUrl: '/pro',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}/pro`, // Actual redirect destination
          permanent: false,
        },
      });
    });

    test('getServerSideProps should redirect Sokoban to Thinky pro page', async () => {
      const context = {
        req: {
          headers: {
            host: 'sokoban.localhost:3000',
          },
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        resolvedUrl: '/pro',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}/pro`, // Actual redirect destination
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

    test('getServerSideProps should include environment variables in props', async () => {
      // Set test environment variables
      const originalCustomerPortal = process.env.STRIPE_CUSTOMER_PORTAL;

      process.env.STRIPE_CUSTOMER_PORTAL = 'https://billing.stripe.com/test';

      try {
        const context = {
          req: {
            ...mockReq,
            cookies: {
              token: getTokenCookieValue(TestId.USER),
            },
          },
          resolvedUrl: '/pro',
        };

        const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

        expect(result).toHaveProperty('props');
        expect((result as any).props.stripeCustomerPortalLink).toBe('https://billing.stripe.com/test');
        expect((result as any).props.stripePaymentLink).toBeDefined();
        expect((result as any).props.stripePaymentYearlyLink).toBeDefined();
      } finally {
        // Restore original environment
        if (originalCustomerPortal !== undefined) {
          process.env.STRIPE_CUSTOMER_PORTAL = originalCustomerPortal;
        } else {
          delete process.env.STRIPE_CUSTOMER_PORTAL;
        }
      }
    });

    test('getServerSideProps should handle empty cookies gracefully', async () => {
      const context = {
        req: {
          ...mockReq,
          cookies: {},
        },
        resolvedUrl: '/pro',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login?redirect=' + encodeURIComponent('/pro'),
          permanent: false,
        },
      });
    });

    test('getServerSideProps should verify game ID handling for Thinky', async () => {
      const context = {
        req: {
          headers: {
            host: 'thinky.localhost:3000',
          },
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
        resolvedUrl: '/pro',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      // Should return props (not redirect) because we're on Thinky
      expect(result).toHaveProperty('props');
      expect((result as any).props.stripePaymentLink).toBeDefined();
    });

    test('getServerSideProps should handle null cookies gracefully', async () => {
      const context = {
        req: {
          ...mockReq,
          cookies: null,
        },
        resolvedUrl: '/pro',
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        redirect: {
          destination: '/login?redirect=' + encodeURIComponent('/pro'),
          permanent: false,
        },
      });
    });
  });
});
