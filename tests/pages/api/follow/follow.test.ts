import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import NotificationType from '../../../../constants/notificationType';
import TestId from '../../../../constants/testId';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { NotificationModel } from '../../../../models/mongoose';
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
  test('follow', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          body: {
            action: 'follow',
            id: TestId.USER_B,
            targetType: 'user',
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
            action: 'follow',
            id: TestId.USER_B,
            targetType: 'user',
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
            action: 'follow',
            id: TestId.USER_B,
            targetType: 'user',
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
            action: 'follow',
            id: TestId.USER_B,
            targetType: 'user',
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
