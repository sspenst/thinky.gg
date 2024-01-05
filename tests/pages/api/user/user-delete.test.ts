import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserModel } from '@root/models/mongoose';
import { cancelSubscription, stripe } from '@root/pages/api/subscription';
import { enableFetchMocks } from 'jest-fetch-mock';
import mongoose from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import modifyUserHandler from '../../../../pages/api/user/index';
import mockSubscription from '../subscription/mockSubscription';

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
        list: jest.fn(),
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

describe('pages/api/collection/index.ts', () => {
  const cookie = getTokenCookieValue(TestId.USER);

  test('Deleting a user that has a subscription should not work', async () => {
    await UserModel.updateOne({ _id: TestId.USER }, { stripeCustomerId: mockSubscription.id });

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
    // mock stripe.paymentMethods.list
    (stripe.paymentMethods.list as jest.Mock).mockResolvedValue({
      data: [{}],
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

        expect(response.error).toBe('You must cancel all subscriptions before deleting your account. Contact help@thinky.gg if you are still experiencing issues');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Deleting a user should work once they downgrade', async () => {
    await UserModel.updateOne({ _id: TestId.USER }, { stripeCustomerId: mockSubscription.id });
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
    (stripe.paymentMethods.list as jest.Mock).mockResolvedValue({
      data: [],
    });

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
