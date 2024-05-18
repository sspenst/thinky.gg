import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { CommentModel, LevelModel, UserModel } from '@root/models/mongoose';
import { cancelSubscription, stripe } from '@root/pages/api/subscription';
import { enableFetchMocks } from 'jest-fetch-mock';
import mongoose, { Types } from 'mongoose';
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
beforeEach(async () => {
  await dbConnect();
});
afterEach(async() => {
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
      pagesHandler: async (_, res) => {
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
      pagesHandler: async (_, res) => {
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

    await testApiHandler({
      pagesHandler: async (_, res) => {
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
  test('Deleting comments and replies', async () => {
    const comment1 = await CommentModel.create({
      author: new Types.ObjectId(TestId.USER),
      text: '1',
      target: new Types.ObjectId(TestId.USER_B),
      targetModel: 'User',
    });

    await CommentModel.create({
      author: new Types.ObjectId(TestId.USER_B),
      text: '1reply',
      target: comment1._id,
      targetModel: 'Comment',
    });

    await CommentModel.create({
      author: new Types.ObjectId(TestId.USER),
      text: '1replyb',
      target: comment1._id,
      targetModel: 'Comment',
    });

    const comment2 = await CommentModel.create({
      author: new Types.ObjectId(TestId.USER_B),
      text: '2',
      target: new Types.ObjectId(TestId.USER),
      targetModel: 'User',
    });

    await CommentModel.create({
      author: new Types.ObjectId(TestId.USER),
      text: '2reply',
      target: comment2._id,
      targetModel: 'Comment',
    });

    const commentCount = await CommentModel.countDocuments({ deletedAt: null });

    expect(commentCount).toBe(5);

    await testApiHandler({
      pagesHandler: async (_, res) => {
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

        const commentCount = await CommentModel.countDocuments({ deletedAt: null });

        expect(commentCount).toBe(0);
      },
    });
  });
  test('Deleting levels', async () => {
    // draft levels should be marked as deleted
    // published levels should be moved to archive

    const levels = await LevelModel.find({ userId: TestId.USER }, {}, { sort: { _id: 1 } });

    expect(levels.length).toBe(4);
    expect(levels[0].isDraft).toBe(false);
    expect(levels[1].isDraft).toBe(true);
    expect(levels[2].isDraft).toBe(false);
    expect(levels[3].isDeleted).toBe(true);

    const archiveLevels = await LevelModel.find({ userId: TestId.ARCHIVE }, {}, { sort: { _id: 1 } });

    expect(archiveLevels.length).toBe(0);

    await testApiHandler({
      pagesHandler: async (_, res) => {
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

        const userLevels = await LevelModel.find({ userId: TestId.USER }, {}, { sort: { _id: 1 } });

        expect(userLevels.length).toBe(2);
        expect(userLevels[0].isDraft).toBeTruthy();
        expect(userLevels[0].isDeleted).toBeTruthy();
        expect(userLevels[1].isDeleted).toBeTruthy();

        const archiveLevels = await LevelModel.find({ userId: TestId.ARCHIVE }, {}, { sort: { _id: 1 } });

        expect(archiveLevels.length).toBe(2);
        expect(archiveLevels[0].slug).toBe('archive/test-level-1');
        expect(archiveLevels[1].slug).toBe('archive/x');
      },
    });
  });
});
