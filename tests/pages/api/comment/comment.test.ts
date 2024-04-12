import NotificationType from '@root/constants/notificationType';
import Notification from '@root/models/db/notification';
import { NotificationModel } from '@root/models/mongoose';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import handler from '../../../../pages/api/comment/[id]';
import gethandler from '../../../../pages/api/comment/get';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
enableFetchMocks();

describe('Testing commenting', () => {
  test('Create a comment with an unconfirmed email', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_D),
          },
          query: {
            id: TestId.USER_B,
          },
          body: {
            targetModel: 'User',
            text: 'My comment'.repeat(1000),
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

        expect(response.error).toBe('Commenting requires a full account with a confirmed email');
        expect(res.status).toBe(401);
      },
    });
  });
  test('Create a comment too long', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.USER_B,
          },
          body: {
            targetModel: 'User',
            text: 'My comment'.repeat(1000),
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

        expect(response.error).toBe('Comment must be between 1-500 characters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Create a comment on userB', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.USER_B,
          },
          body: {
            targetModel: 'User',
            text: 'My comment',
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
        expect(response.metadata).toBeDefined();
        expect(response.metadata.totalRows).toBe(1);
        expect(response.data).toHaveLength(1);
        const com = response.data[0];

        expect(com.text).toBe('My comment');
        expect(com.author._id).toBe(TestId.USER);
      },
    });
  });
  test('Create a second comment on userB', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.USER_B,
          },
          body: {
            targetModel: 'User',
            text: 'My comment 2',
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
        expect(response.metadata).toBeDefined();
        expect(response.metadata.totalRows).toBe(2);
        expect(response.data).toHaveLength(2);
        const com = response.data[0];

        expect(com.text).toBe('My comment 2');
        expect(com.author._id).toBe(TestId.USER);
      },
    });
  });
  let commentId: string;
  let commentId2: string;

  test('Get comments for a user', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.USER_B,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await gethandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.totalRows).toBe(2);

        const comment = response.comments[0];

        commentId = comment._id;

        const comment2 = response.comments[1];

        commentId2 = comment2._id;
        expect(comment.text).toBe('My comment 2');
        expect(comment.author._id).toBe(TestId.USER);
        expect(comment.author.password).toBeUndefined();
      },
    });
  });
  test('Create a comment ON another comment', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: commentId,
          },
          body: {
            targetModel: 'Comment',
            text: 'My SUB comment',
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
        expect(response.metadata).toBeDefined();
        expect(response.metadata.totalRows).toBe(1);
        expect(response.data).toHaveLength(1);
        const com = response.data[0];

        expect(com.text).toBe('My SUB comment');
        expect(com.author._id).toBe(TestId.USER);
      },
    });
  });
  test('Create another comment ON another comment', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: commentId,
          },
          body: {
            targetModel: 'Comment',
            text: 'My SUB comment 2',
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
        expect(response.metadata).toBeDefined();
        expect(response.metadata.totalRows).toBe(2);
        expect(response.data).toHaveLength(2);
        const com = response.data[1];

        expect(com.text).toBe('My SUB comment 2');
        expect(com.author._id).toBe(TestId.USER_B);

        const notifications = await NotificationModel.find<Notification>({ type: NotificationType.NEW_WALL_REPLY });

        expect(notifications.length).toBe(1);
        expect(notifications[0].target.toString()).toBe(TestId.USER_B);
        expect(notifications[0].userId.toString()).toBe(TestId.USER);
      },
    });
  });
  test('Get comments for a user', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.USER_B,
            page: '0'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await gethandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.totalRows).toBe(2);

        const comment = response.comments[0];

        expect(comment.text).toBe('My comment 2');
        expect(comment.author._id).toBe(TestId.USER);
        expect(comment.author.password).toBeUndefined();
        expect(comment._id).toBe(commentId);
        expect(comment.target).toBeDefined();
        expect(comment.targetModel).toBe('User');
        expect(comment.totalReplies).toBe(2);
        expect(comment.replies[0].targetModel).toBe('Comment');
        expect(comment.replies[0].text).toBe('My SUB comment');
      },
    });
  });
  test('Delete a comment i did not created (user c tries to delete user A comment)', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_C),
          },
          query: {
            id: commentId,
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

        expect(response.error).toBe('There was a problem deleting this comment.');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Delete a comment i created', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: commentId,
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

        expect(response.data).toHaveLength(1);
      },
    });
  });
  test('Delete a comment i did not create but is on my profile', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: commentId2,
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

        expect(response.data).toHaveLength(0);
      },
    });
  });
  test('Delete already deleted comment', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: commentId,
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

        expect(response.error).toBe('There was a problem deleting this comment.');
        expect(res.status).toBe(400);
      },
    });
  });
});
