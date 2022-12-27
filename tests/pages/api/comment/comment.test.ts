import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
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
        expect(response.metadata).toBeDefined();
        expect(response.metadata.totalRows).toBe(1);
        expect(response.data).toHaveLength(1);
        const com = response.data[0];

        expect(com.text).toBe('My comment');
        expect(com.author._id).toBe(TestId.USER);
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
        expect(response.totalRows).toBe(1);

        const comment = response.comments[0];

        commentId = comment._id;
        expect(comment.text).toBe('My comment');
        expect(comment.author._id).toBe(TestId.USER);
        expect(comment.author.password).toBeUndefined();
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
        expect(response.metadata).toBeDefined();
        expect(response.metadata.totalRows).toBe(1);
        expect(response.data).toHaveLength(1);
        const com = response.data[0];

        expect(com.text).toBe('My SUB comment');
        expect(com.author._id).toBe(TestId.USER);
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
        expect(response.totalRows).toBe(1);

        const comment = response.comments[0];

        expect(comment.text).toBe('My comment');
        expect(comment.author._id).toBe(TestId.USER);
        expect(comment.author.password).toBeUndefined();
        expect(comment._id).toBe(commentId);
        expect(comment.target).toBeDefined();
        expect(comment.targetModel).toBe('User');
        expect(comment.totalReplies).toBe(1);
        expect(comment.replies[0].targetModel).toBe('Comment');
        expect(comment.replies[0].text).toBe('My SUB comment');
      },
    });
  });
});
