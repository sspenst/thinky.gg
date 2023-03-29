import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserConfigModel } from '@root/models/mongoose';
import { cancelSubscription, stripe } from '@root/pages/api/subscription';
import { enableFetchMocks } from 'jest-fetch-mock';
import mongoose from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import Stripe from 'stripe';
import modifyUserHandler from '../../../../pages/api/user/index';

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

describe('pages/api/collection/index.ts', () => {
  const cookie = getTokenCookieValue(TestId.USER);

  test('Deleting a user that has a subscription should not work', async () => {
    await UserConfigModel.updateOne({ userId: TestId.USER }, { stripeCustomerId: 'cus_123' });
    (stripe.subscriptions.list as jest.Mock).mockResolvedValue({
      data: [mockSubscription],
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: cookie,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Please must cancel your subscription before deleting your account.');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Deleting a user should work once they downgrade', async () => {
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
    const [code, ] = await cancelSubscription({
      headers: { origin: 'localhost' },
      userId: new mongoose.Types.ObjectId(TestId.USER),
      user: { name: 'test' },
    } as unknown as NextApiRequestWithAuth);

    mockSubscription.cancel_at_period_end = true;

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

    expect(code).toBe(200);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: cookie,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.updated).toBe(true);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Even though we have a valid token, user should not be found if they have been deleted', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: cookie,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.success).toBeUndefined();
        expect(response.error).toBeDefined();
        expect(response.error).toBe('Unauthorized: User not found');
        expect(res.status).toBe(401);
      },
    });
  });
});
