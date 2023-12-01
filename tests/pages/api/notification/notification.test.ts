import { GameId } from '@root/constants/GameId';
import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import NotificationType from '../../../../constants/notificationType';
import TestId from '../../../../constants/testId';
import getMobileNotification from '../../../../helpers/getMobileNotification';
import { logger } from '../../../../helpers/logger';
import { createNewRecordOnALevelYouSolvedNotifications, createNewReviewOnYourLevelNotification } from '../../../../helpers/notificationHelper';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import Notification from '../../../../models/db/notification';
import { NotificationModel } from '../../../../models/mongoose';
import notificationHandler from '../../../../pages/api/notification';
import unpublishLevelHandler from '../../../../pages/api/unpublish/[id]';
import modifyUserHandler from '../../../../pages/api/user/index';

afterEach(() => {
  jest.restoreAllMocks();
});
beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

const DefaultReq = {
  method: 'PUT',
  cookies: {
    token: getTokenCookieValue(TestId.USER),
  },
  body: {

  },
  headers: {
    'content-type': 'application/json',
  },
};

describe('Notifications', () => {
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

  test('Trying to put but no body', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          body: undefined,
        } as unknown as NextApiRequestWithAuth;

        await notificationHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Bad request');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Trying to put with invalid id', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          body: {
            ids: ['abc'],
          },
        } as unknown as NextApiRequestWithAuth;

        await notificationHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid body.ids, body.read');
        expect(res.status).toBe(400);
      },
    });
  });
  let notificationId = '';
  let notificationId2 = '';

  test('Create a few notifications for this user', async () => {
    const ONE_DAY = 86400000;

    MockDate.set(Date.now() - ONE_DAY);
    const n1: Notification[] = await createNewRecordOnALevelYouSolvedNotifications(GameId.PATHOLOGY, [TestId.USER], TestId.USER_B, TestId.LEVEL, 'blah') as Notification[];

    MockDate.set(Date.now() + ONE_DAY);
    const n2 = await createNewReviewOnYourLevelNotification(GameId.PATHOLOGY, new Types.ObjectId(TestId.USER), new Types.ObjectId(TestId.USER_B), TestId.LEVEL, '4') as Notification;

    expect(new Date(n1[0].updatedAt).getTime()).toBeLessThan(new Date(n2.updatedAt).getTime());

    // reviewing your own level should be null
    const nullNotif = await createNewReviewOnYourLevelNotification(GameId.PATHOLOGY, new Types.ObjectId(TestId.USER_B), new Types.ObjectId(TestId.USER_B), TestId.LEVEL, '4');

    expect(nullNotif).toBeNull();

    const notifs = await NotificationModel.find({});

    expect(notifs).toHaveLength(2);
    expect(notifs[0].gameId).toBe(GameId.PATHOLOGY);
    expect(notifs[1].gameId).toBe(GameId.PATHOLOGY);

    // Now get the current user and check notifications

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(response.notifications).toHaveLength(2);
        notificationId = response.notifications[0]._id;

        expect(response.notifications[0].userId).toBe(TestId.USER);
        expect(response.notifications[0].source._id).toBe(TestId.USER_B);
        expect(response.notifications[0].source.name).toBe('BBB'); // ensure we populate this correctly
        expect(response.notifications[0].source.email).toBeUndefined();
        expect(response.notifications[0].source.ip_addresses_used).toBeUndefined();
        expect(response.notifications[0].source.password).toBeUndefined();
        expect(response.notifications[0].target._id).toBe(TestId.LEVEL);
        expect(response.notifications[0].target.name).toBe('test level 1'); // ensure we populate this correctly
        expect(response.notifications[0].message).toBe('4,false');
        expect(response.notifications[0].type).toBe(NotificationType.NEW_REVIEW_ON_YOUR_LEVEL);
        expect(response.notifications[0].read).toBe(false);
        expect(response.notifications[1].read).toBe(false);
        notificationId2 = response.notifications[1]._id;

        const notificationSample: Notification = response.notifications[0];
        const data = getMobileNotification(notificationSample);

        expect(data.title).toBe('Pathology - New Review');
        expect(data.body).toBe('BBB gave a 4 star rating on your level test level 1');
        expect(data.url).toEqual('https://pathology.gg/level/test/test-level-1');
      },
    });
  });
  test('Trying to put with correct id but no body', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          body: {
            ids: [notificationId],
          },
        } as unknown as NextApiRequestWithAuth;

        await notificationHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid body.read');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Trying to put with unknown but correct objectid', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          body: {
            ids: [new Types.ObjectId()],
            read: true
          }
        } as unknown as NextApiRequestWithAuth;

        await notificationHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('No notifications updated');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Trying to put with correct id and correct body', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          body: {
            ids: [notificationId],
            read: true,
          }
        } as unknown as NextApiRequestWithAuth;

        await notificationHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response).toHaveLength(2);
        expect(response[0]._id).toBe(notificationId);
        expect(response[0].userId).toBe(TestId.USER);
        expect(response[0].source._id).toBe(TestId.USER_B);
        expect(response[0].source.name).toBe('BBB'); // ensure we populate this correctly
        expect(response[0].target._id).toBe(TestId.LEVEL);
        expect(response[0].target.name).toBe('test level 1'); // ensure we populate this correctly
        expect(response[0].message).toBe('4,false');
        expect(response[0].type).toBe(NotificationType.NEW_REVIEW_ON_YOUR_LEVEL);
        expect(response[0].read).toBe(true); // This should have changed
        expect(response[1].type).toBe(NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_SOLVED);
        expect(response[1].read).toBe(false);
      },
    });
  });
  test('Trying to put but the db errors', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    jest.spyOn(NotificationModel, 'updateMany').mockImplementationOnce(() => {
      throw new Error('Test DB Error');
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          body: {
            ids: [notificationId],
            read: true,
          }
        } as unknown as NextApiRequestWithAuth;

        await notificationHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Internal server error');
        expect(res.status).toBe(500);
      },
    });
  });
  test('Mark all as read', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          body: {
            ids: [notificationId, notificationId2],
            read: true,
          }
        } as unknown as NextApiRequestWithAuth;

        await notificationHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response).toHaveLength(2);
        expect(new Date(response[0].createdAt).getTime()).toBeGreaterThan(new Date(response[1].createdAt).getTime());
        expect(response[0]._id).toBe(notificationId);
        expect(response[0].userId).toBe(TestId.USER);
        expect(response[0].source._id).toBe(TestId.USER_B);
        expect(response[0].source.name).toBe('BBB'); // ensure we populate this correctly
        expect(response[0].target._id).toBe(TestId.LEVEL);
        expect(response[0].target.name).toBe('test level 1'); // ensure we populate this correctly
        expect(response[0].message).toBe('4,false');
        expect(response[0].type).toBe(NotificationType.NEW_REVIEW_ON_YOUR_LEVEL);
        expect(response[0].read).toBe(true);
        expect(response[1].type).toBe(NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_SOLVED);
        expect(response[1].read).toBe(true); // this should have change
      },
    });
  });
  test('Make sure that notifications are marked as read now when returning the user', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(response.notifications[0].read).toBe(true);

        expect(response.notifications[1].read).toBe(true);
      },
    });
  });
  test('Unpublishing a level should delete associated notifications', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          headers: {
            'content-type': 'application/json',
          },
          query: {
            id: TestId.LEVEL,
          },
        } as unknown as NextApiRequestWithAuth;

        await unpublishLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
      },
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(response.notifications.length).toBe(0);
      },
    });
  });
});
