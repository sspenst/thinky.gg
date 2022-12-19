import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import User from '../../../../models/db/user';
import { CommentModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/comment/[id]';

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
  test('Create a comment', async () => {
    await testApiHandler({
      handler: async (_, res) => {
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
        expect(response.text).toBe('My comment');
        expect(response.author).toBe(TestId.USER);
      },
    });
  });
  let commentId: string;

  test('Get comments for a user', async () => {
    await testApiHandler({
      handler: async (_, res) => {
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

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.length).toBe(1);
        commentId = response[0]._id;
        expect(response[0].text).toBe('My comment');
        expect(response[0].author._id).toBe(TestId.USER);
        expect(response[0].author.password).toBeUndefined();
      },
    });
  });
  test('Create a comment ON another comment', async () => {
    await testApiHandler({
      handler: async (_, res) => {
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
        expect(response.text).toBe('My SUB comment');
        expect(response.author).toBe(TestId.USER);
      },
    });
  });
  test('Get comments for a user', async () => {
    await testApiHandler({
      handler: async (_, res) => {
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

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.length).toBe(1);
        expect(response[0].text).toBe('My comment');
        expect(response[0].author._id).toBe(TestId.USER);
        expect(response[0].author.password).toBeUndefined();

        expect(response[0]._id).toBe(commentId);

        expect(response[0].target).toBeDefined();
        expect(response[0].targetModel).toBe('User');
        expect(response[0].children).toHaveLength(1);
        expect(response[0].children[0].targetModel).toBe('Comment');
        expect(response[0].children[0].text).toBe('My SUB comment');
      },
    });
  });
});
