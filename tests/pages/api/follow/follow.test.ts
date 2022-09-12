import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import GraphType from '../../../../constants/graphType';
import NotificationType from '../../../../constants/notificationType';
import TestId from '../../../../constants/testId';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { GraphModel, NotificationModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/follow/index';

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();
const defaultObj = {
  method: 'PUT',
  cookies: {
    token: getTokenCookieValue(TestId.USER),
  },
  headers: {
    'Content-Type': 'application/json',
  },
};

describe('api/follow', () => {
  test('follow myself', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          body: {
            action: GraphType.FOLLOW,
            id: TestId.USER,
            targetModel: 'User',
          }
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Cannot follow yourself');
        expect(res.status).toBe(400);
      },
    });
  });
  test(GraphType.FOLLOW, async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          body: {
            action: GraphType.FOLLOW,
            id: TestId.USER_B,
            targetModel: 'User',
          }
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.followerCount).toBe(1);
        expect(response.isFollowing).toBe(true);

        // check notifications
        const notifs = await NotificationModel.find({ userId: TestId.USER_B, type: NotificationType.NEW_FOLLOWER });

        expect(notifs).toHaveLength(1);
      },
    });
  });
  test('follow twice', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          body: {
            action: GraphType.FOLLOW,
            id: TestId.USER_B,
            targetModel: 'User',
          }
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.followerCount).toBe(1);
        expect(response.isFollowing).toBe(true);
        const notifs = await NotificationModel.find({ userId: TestId.USER_B, type: NotificationType.NEW_FOLLOWER });

        expect(notifs).toHaveLength(1); // should still only have 1 notification
        const allGraphConns = await GraphModel.find({});

        expect(allGraphConns).toHaveLength(1); // should still only have 1 graph connection
      },
    });
  });
  test('follow another person', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          body: {
            action: GraphType.FOLLOW,
            id: TestId.USER_C,
            targetModel: 'User',
          }
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.followerCount).toBe(1);
        expect(response.isFollowing).toBe(true);
        const notifs = await NotificationModel.find({ userId: TestId.USER_B, type: NotificationType.NEW_FOLLOWER });

        expect(notifs).toHaveLength(1); // should still only have 1 notification

        const allGraphConns = await GraphModel.find({});

        expect(allGraphConns).toHaveLength(2);
      },
    });
  });
  test('GET', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          method: 'GET',
          query: {
            id: TestId.USER_B,
          }
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.followerCount).toBe(1);
        expect(response.isFollowing).toBe(true);
      },
    });
  });
  test('unfollow', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          method: 'DELETE',
          body: {
            action: GraphType.FOLLOW,
            id: TestId.USER_B,
            targetModel: 'User',
          }
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.followerCount).toBe(0);
        expect(response.isFollowing).toBe(false);
        const notifs = await NotificationModel.find({ userId: TestId.USER_B, type: NotificationType.NEW_FOLLOWER });

        expect(notifs).toHaveLength(0); // notification should have gone away
        const allGraphConns = await GraphModel.find({});

        expect(allGraphConns).toHaveLength(1);
      },
    });
  });
  test('unfollow twice', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          method: 'DELETE',
          body: {
            action: GraphType.FOLLOW,
            id: TestId.USER_B,
            targetModel: 'User',
          }
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Not following');
        expect(res.status).toBe(400);
      },
    });
  });
});
