import Theme from '@root/constants/theme';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import GraphType from '../../../../constants/graphType';
import NotificationType from '../../../../constants/notificationType';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { initLevel } from '../../../../lib/initializeLocalDb';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { GraphModel, LevelModel, NotificationModel, UserConfigModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/follow/index';
import publishLevelHandler from '../../../../pages/api/publish/[id]';
import userHandle from '../../../../pages/api/user/index';

beforeAll(async () => {
  await dbConnect();
});
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
  test('follow', async () => {
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
  test('new level notification', async () => {
    await dbConnect();

    // USER is still following USER_C, so we're getting USER_C to publish a level
    const [level, ] = await Promise.all([
      initLevel(TestId.USER_C, 'notif', {
        data: '43',
        height: 1,
        isDraft: true,
        leastMoves: 1,
        width: 2,
      }),
      // set emailConfirmed for UserC. User C has no user config
      await UserConfigModel.create({
        _id: new Types.ObjectId(),
        theme: Theme.Modern,
        userId: new Types.ObjectId(TestId.USER_C),
        emailConfirmed: true
      })

    ]);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_C),
          },
          query: {
            id: level._id,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await publishLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response._id).toBe(level._id.toString());

        const lvl = await LevelModel.findById(level._id);

        expect(lvl.isDraft).toBe(false);

        const notifs = await NotificationModel.find({ userId: TestId.USER, type: NotificationType.NEW_LEVEL });

        expect(notifs).toHaveLength(1);
      },
    });
  });
  test('Follow with multiple users (to test user deletion)', async () => {
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
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          cookies: {
            token: getTokenCookieValue(TestId.USER_C),
          },
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
        expect(response.followerCount).toBe(2);
        expect(response.isFollowing).toBe(true);

        // check notifications
        const notifs = await NotificationModel.find({ userId: TestId.USER_B, type: NotificationType.NEW_FOLLOWER });

        expect(notifs).toHaveLength(2);
      },
    });
  });
  test('GET before delete', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          method: 'GET',
          query: {
            id: TestId.USER_C,
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
  test('Now delete a user this user has followed', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_C),
          },
        } as unknown as NextApiRequestWithAuth;

        await userHandle(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
  });
  test('GET after delete', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          method: 'GET',
          query: {
            id: TestId.USER_C,
          }
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.followerCount).toBe(0); // Here is difference!
        expect(response.isFollowing).toBe(false); // and here
      },
    });
  });
  test('GET after delete another user to make sure we only deleted what we needed to', async () => {
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
});
