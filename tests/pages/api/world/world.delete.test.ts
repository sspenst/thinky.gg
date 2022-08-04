import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ObjectId } from 'bson';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { enableFetchMocks } from 'jest-fetch-mock';
import getCollectionHandler from '../../../../pages/api/collection-by-id/[id]';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import modifyCollectionHandler from '../../../../pages/api/collection/[id]';
import { testApiHandler } from 'next-test-api-route-handler';

afterAll(async() => {
  await dbDisconnect();
});
const USER_ID_FOR_TESTING = '600000000000000000000000';
const COLLECTION_ID_FOR_TESTING = '600000000000000000000001';
const differentUser = '600000000000000000000006';

enableFetchMocks();
describe('pages/api/collection/index.ts', () => {
  test('Doing a DELETE for unknown collection should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(differentUser),
          },
          query: {
            id: new ObjectId().toString(), // unknown
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
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(differentUser),
          },
          query: {
            id: COLLECTION_ID_FOR_TESTING,
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
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: COLLECTION_ID_FOR_TESTING,
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
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: COLLECTION_ID_FOR_TESTING,
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
