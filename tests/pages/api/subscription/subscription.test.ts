import { ProSubscriptionType } from '@root/constants/ProSubscriptionType';
import TestId from '@root/constants/testId';
import { logger } from '@root/helpers/logger';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserModel } from '@root/models/mongoose';
import giftHandler, { GiftType } from '@root/pages/api/subscription/gift';
import handler, { stripe } from '@root/pages/api/subscription/index';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import mockSubscription from './mockSubscription';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      customers: {
        retrieve: jest.fn(),
      },
      plans: {
        retrieve: jest.fn(),
      },
      products: {
        retrieve: jest.fn(),
      },
      paymentMethods: {
        retrieve: jest.fn(),
        list: jest.fn(),
      },
      subscriptions: {
        create: jest.fn(),
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
        expect(response).toBeDefined();
        expect(response.subscriptions).toHaveLength(1);
        expect(response.subscriptions[0].subscriptionId).toBe(mockSubscription.id);
      },
    });
  });
  test('POST api/subscription for pathology', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO)
          },
          body: {
            type: ProSubscriptionType.Monthly,
            paymentMethodId: 'test',
          },
          headers: {
            'content-type': 'application/json',
            'host': 'pathology.localhost',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(400);
        expect(response.error).toBe('You are already subscribed to Pathology Pro');
      },
    });
  });
  test('POST api/subscription for pathoban', async () => {
    (stripe.customers.retrieve as jest.Mock).mockResolvedValue({
      id: 'rerieve_test',
    });
    (stripe.subscriptions.create as jest.Mock).mockResolvedValue({
      data: [mockSubscription],
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO)
          },
          body: {
            type: ProSubscriptionType.Monthly,
            paymentMethodId: 'test',
          },
          headers: {
            'content-type': 'application/json',
            'host': 'pathoban.localhost',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.subscription.data[0].id).toBe(mockSubscription.id);
      },
    });
  });
  test('POST gift subscription should return value', async () => {
    (stripe.subscriptions.list as jest.Mock).mockResolvedValue({
      data: [mockSubscription],
    });
    (stripe.subscriptions.create as jest.Mock).mockResolvedValue({
      data: [mockSubscription],
    });
    (stripe.customers.retrieve as jest.Mock).mockResolvedValue({
      id: 'rerieve_test',
    });
    (stripe.products.retrieve as jest.Mock).mockResolvedValue({
      name: 'test product',
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO)
          },
          body: {
            type: GiftType.Monthly,
            quantity: 1,
            giftTo: TestId.USER,
            paymentMethodId: 'test',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await giftHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);

        expect(response.subscription.data[0].id).toBe(mockSubscription.id);
      },
    });
  });
  test('GET gift subscription should return value', async () => {
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

        await giftHandler(req, res);
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
    await UserModel.updateOne({ _id: TestId.USER }, { stripeCustomerId: mockSubscription.customer });
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
