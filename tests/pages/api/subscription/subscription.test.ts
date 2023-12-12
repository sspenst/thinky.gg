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
      plans: {
        retrieve: jest.fn(),
      },
      products: {
        retrieve: jest.fn(),
      },
      paymentMethods: {
        retrieve: jest.fn(),
      },
      subscriptions: {
        list: jest.fn(),
        update: jest.fn(),
        search: jest.fn(),
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
  test('subscription should return value', async () => {
    (stripe.subscriptions.list as jest.Mock).mockResolvedValue({
      data: [mockSubscription],
    });
    (stripe.subscriptions.search as jest.Mock).mockResolvedValue({
      data: [mockSubscription],
    });
    (stripe.plans.retrieve as jest.Mock).mockResolvedValue({
      product: 'test',
    });
    (stripe.products.retrieve as jest.Mock).mockResolvedValue({
      name: 'test product',
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

        expect(response).toHaveLength(1);
        expect(response[0].subscriptionId).toBe(mockSubscription.id);
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
});
