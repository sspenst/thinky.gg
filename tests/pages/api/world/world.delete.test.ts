import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ObjectId } from 'bson';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { enableFetchMocks } from 'jest-fetch-mock';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import getWorldHandler from '../../../../pages/api/world-by-id/[id]';
import modifyWorldHandler from '../../../../pages/api/world/[id]';
import { testApiHandler } from 'next-test-api-route-handler';

afterAll(async() => {
  await dbDisconnect();
});
const USER_ID_FOR_TESTING = '600000000000000000000000';
const WORLD_ID_FOR_TESTING = '600000000000000000000001';
const differentUser = '600000000000000000000006';

enableFetchMocks();
describe('pages/api/world/index.ts', () => {
  test('Doing a DELETE for unknown world should error', async () => {
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

        await modifyWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('World not found');
        expect(response.success).toBeUndefined();
        expect(res.status).toBe(404);
      },
    });
  });
  test('Doing a DELETE when we don\'t own the world should not error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(differentUser),
          },
          query: {
            id: WORLD_ID_FOR_TESTING,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Not authorized to delete this World');
        expect(response.success).toBeUndefined();
        expect(res.status).toBe(401);
      },
    });
  });
  test('Doing a DELETE for valid world that i own should not error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: WORLD_ID_FOR_TESTING,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyWorldHandler(req, res);
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
  test('now we should NOT be able to get the world', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: WORLD_ID_FOR_TESTING,
          },
        } as unknown as NextApiRequestWithAuth;

        await getWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding World');
        expect(res.status).toBe(404);
      },
    });
  });
});
