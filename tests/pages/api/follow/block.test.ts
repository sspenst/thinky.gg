import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import GraphType from '../../../../constants/graphType';
import NotificationType from '../../../../constants/notificationType';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { GraphModel, NotificationModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/follow/index';
import userHandle from '../../../../pages/api/user/index';

beforeAll(async () => {
  await dbConnect();
});

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
        list: jest.fn().mockReturnValue({ data: [] }),
        update: jest.fn(),
        search: jest.fn().mockReturnValue({ data: [] }),
      },
    };
  });
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
  test('block myself', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          query: {
            action: GraphType.BLOCK,
            id: TestId.USER,
            targetModel: 'User',
          }
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Cannot block yourself');
        expect(res.status).toBe(400);
      },
    });
  });
  test('block', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          query: {
            action: GraphType.BLOCK,
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
        expect(response.followerCount).toBe(0); // since we are blocking
        expect(response.isFollowing).toBe(false); // prove we didn't follow

        // check notifications
        const notifs = await NotificationModel.find({ userId: TestId.USER_B, type: NotificationType.NEW_FOLLOWER });

        expect(notifs).toHaveLength(1);
      },
    });
  });
  test('block twice', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          query: {
            action: GraphType.BLOCK,
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

        const allGraphConns = await GraphModel.find({});

        expect(allGraphConns).toHaveLength(1); // should still only have 1 graph connection
      },
    });
  });
  test('follow another person', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          query: {
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
      pagesHandler: async (_, res) => {
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
        expect(response.followerCount).toBe(0);
        expect(response.isFollowing).toBe(false);
      },
    });
  });
  test('unblock', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          method: 'DELETE',
          query: {
            action: GraphType.BLOCK,
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
  test('unblock twice', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          method: 'DELETE',
          query: {
            action: GraphType.BLOCK,
            id: TestId.USER_B,
            targetModel: 'User',
          }
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Not blocking');
        expect(res.status).toBe(400);
      },
    });
  });

  test('Block with multiple users (to test user deletion)', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          query: {
            action: GraphType.BLOCK,
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

        // check notifications
        const notifs = await NotificationModel.find({ userId: TestId.USER_B, type: NotificationType.NEW_FOLLOWER });

        expect(notifs).toHaveLength(1);
      },
    });
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          query: {
            action: GraphType.BLOCK,
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

        // check notifications
        const notifs = await NotificationModel.find({ userId: TestId.USER_B, type: NotificationType.NEW_FOLLOWER });

        expect(notifs).toHaveLength(1);
      },
    });
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          cookies: {
            token: getTokenCookieValue(TestId.USER_C),
          },
          query: {
            action: GraphType.BLOCK,
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
      },
    });
  });
  test('GET before delete', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
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
  test('Now delete a user this user has blocked', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
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
      pagesHandler: async (_, res) => {
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
      pagesHandler: async (_, res) => {
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
        expect(response.followerCount).toBe(0);
        expect(response.isFollowing).toBe(false);
      },
    });
  });
});
