import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserConfigModel } from '@root/models/mongoose';
import handler, { stripe } from '@root/pages/api/subscription/index';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import Stripe from 'stripe';
// Import Stripe and the necessary types

// Place the jest.mock() call at the top of the file, outside the test cases
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
const mockSubscription: Partial<Stripe.Subscription> = {
  id: 'sub_1234567890',
  items: {
    data: [
      {
        id: 'si_12345',
        object: 'subscription_item',
        plan: {
          id: 'plan_12345',
          object: 'plan',
          amount: 1000,
          currency: 'usd',
          interval: 'month',
          product: 'prod_12345',

          // Add any other properties you need for the plan object
        },
        // Add any other properties you need for the subscription_item object
      },
    ],
    has_more: false,
    total_count: 1,
    object: 'list',
  },
  current_period_start: 1672444800, // Example UNIX timestamp
  current_period_end: 1675036800, // Example UNIX timestamp
  cancel_at_period_end: false,
  status: 'active',
} as any;

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
    await UserConfigModel.updateOne({ userId: TestId.USER }, { stripeCustomerId: 'cus_123' });

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
    await UserConfigModel.updateOne({ userId: TestId.USER }, { stripeCustomerId: 'cus_123' });
    (stripe.subscriptions.list as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Stripe error');
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
          plan: mockSubscription.items?.data[0].plan,
          current_period_start: mockSubscription.current_period_start,
          current_period_end: mockSubscription.current_period_end,
          cancel_at_period_end: mockSubscription.cancel_at_period_end,
          status: mockSubscription.status,
        });
        // finish this test
      },
    });
  });
  test('test unsubscribe and server error', async () => {
    await UserConfigModel.updateOne({ userId: TestId.USER }, { stripeCustomerId: 'cus_123' });
    (stripe.subscriptions.list as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Stripe error');
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
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
  test('test unsubscribe and server does not error but our db doesnt have their customer id', async () => {
    await UserConfigModel.updateOne({ userId: TestId.USER }, { stripeCustomerId: 'cus_123' });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
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

        expect(response.error).toBe('Unknown stripe subscription.');
      },
    });
  });
  test('test unsubscribe but for some reason we are not able to cancel at period end', async () => {
    await UserConfigModel.updateOne({ userId: TestId.USER }, { stripeCustomerId: mockSubscription.id });
    // Inside your test
    (stripe.subscriptions.list as jest.Mock).mockResolvedValue({
      data: [mockSubscription],
    });

    // mock the stripe update
    mockSubscription.cancel_at_period_end = true;
    (stripe.subscriptions.update as jest.Mock).mockResolvedValue(
      {
        ...mockSubscription,
        cancel_at_period_end: false,
        status: 'active',
      },
    );
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
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

        expect(res.status).toBe(400);

        expect(response.error).toBe('Subscription could not be scheduled for cancellation.');
      },
    });
  });
  test('test unsubscribe and we are able to cancel', async () => {
    await UserConfigModel.updateOne({ userId: TestId.USER }, { stripeCustomerId: mockSubscription.id });
    // Inside your test
    (stripe.subscriptions.list as jest.Mock).mockResolvedValue({
      data: [mockSubscription],
    });

    (stripe.subscriptions.update as jest.Mock).mockResolvedValue(
      {
        ...mockSubscription,
        cancel_at_period_end: true,
        status: 'active',
      },
    );
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
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

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.message).toBe('Subscription will be canceled at the end of the current billing period.');
      },
    });
  });
});
