import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import modifyCollectionHandler from '../../../../pages/api/collection/[id]';
import getCollectionHandler from '../../../../pages/api/collection-by-id/[id]';

afterAll(async() => {
  await dbDisconnect();
});
beforeAll(async () => {
  await dbConnect();
});
enableFetchMocks();
describe('pages/api/collection/index.ts', () => {
  test('Doing a DELETE for unknown collection should error', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: new Types.ObjectId().toString(), // unknown
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Collection not found');
        expect(response.success).toBeUndefined();
        expect(res.status).toBe(404);
      },
    });
  });
  test('Doing a DELETE when we don\'t own the collection should not error', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: TestId.COLLECTION,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Not authorized to delete this Collection');
        expect(response.success).toBeUndefined();
        expect(res.status).toBe(401);
      },
    });
  });
  test('Doing a DELETE for valid collection that i own should not error', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.COLLECTION,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.success).toBeUndefined(); /** @TODO: Probably should be defined */
        expect(res.status).toBe(200);
      },
    });
  });
  test('now we should NOT be able to get the collection', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.COLLECTION,
          },
        } as unknown as NextApiRequestWithAuth;

        await getCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding Collection');
        expect(res.status).toBe(404);
      },
    });
  });
});
