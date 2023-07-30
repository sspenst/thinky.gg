import TestId from '@root/constants/testId';
import { logger } from '@root/helpers/logger';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserConfigModel } from '@root/models/mongoose';
import handler, { stripe } from '@root/pages/api/subscription/index';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import mockSubscription from './mockSubscription';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      subscriptions: {
        list: jest.fn(),
        update: jest.fn(),
      },
    };
  });
});

beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
enableFetchMocks();

describe('api/subscription', () => {
  test('no subscription should return 404', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER)
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(404);

        expect(response.error).toBe('No subscription found for this user.');
      },
    });
  });
  test('if user has a subscription customer id that no longer is valid on stripe', async () => {
    await UserConfigModel.updateOne({ userId: TestId.USER }, { stripeCustomerId: mockSubscription.customer });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER)
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(404);

        expect(response.error).toBe('Unknown stripe subscription.');
      },
    });
  });
  test('test stripe library throwing error', async () => {
    await UserConfigModel.updateOne({ userId: TestId.USER }, { stripeCustomerId: mockSubscription.customer });
    (stripe.subscriptions.list as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Stripe error');
    });
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER)
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(500);

        expect(response.error).toBe('Stripe error looking up subscriptions.');
      },
    });
  });
  test('If user has a valid subscription', async () => {
    await UserConfigModel.updateOne({ userId: TestId.USER }, { stripeCustomerId: 'valid' });

    // Inside your test
    (stripe.subscriptions.list as jest.Mock).mockResolvedValue({
      data: [mockSubscription],
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER)
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response).toEqual({
          subscriptionId: mockSubscription.id,
          plan: mockSubscription.items.data[0].plan,
          current_period_start: mockSubscription.current_period_start,
          current_period_end: mockSubscription.current_period_end,
          cancel_at_period_end: mockSubscription.cancel_at_period_end,
          status: mockSubscription.status,
        });
        // finish this test
      },
    });
  });
});
