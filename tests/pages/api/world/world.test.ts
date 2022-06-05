import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ObjectId } from 'bson';
import createWorldHandler from '../../../../pages/api/world/index';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import getWorldHandler from '../../../../pages/api/world-by-id/[id]';
import { testApiHandler } from 'next-test-api-route-handler';

afterAll(async() => {
  await dbDisconnect();
});

const USER_ID_FOR_TESTING = '600000000000000000000000';
let world_id: string;

describe('pages/api/world/index.ts', () => {
  test('Sending nothing should return 401', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          cookies: {
            token: '',
          },
        } as unknown as NextApiRequestWithAuth;

        await createWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(401);
      },
    });
  });
  test('querying with a non-GET HTTP method should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: world_id,
          },
        } as unknown as NextApiRequestWithAuth;

        await getWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Doing a POST with no data should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
        } as unknown as NextApiRequestWithAuth;

        await createWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required fields');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a non-POST HTTP method on the create world should fail', async () => {

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            authorNote: 'I\'m a nice little world note.',
            name: 'A Test World',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await createWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Doing a POST but missing a field should fail', async () => {

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            authorNote: 'I\'m a nice little world note.',
            // name: 'A Test World',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await createWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required fields');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a POST with world data should be OK', async () => {

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            authorNote: 'I\'m a nice little world note.',
            name: 'A Test World',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await createWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.success).toBeUndefined();
        world_id = response._id;
        expect(res.status).toBe(200);
      },
    });
  });
  test('now we should be able to get the world', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: world_id,
          },
        } as unknown as NextApiRequestWithAuth;

        await getWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.authorNote).toBe('I\'m a nice little world note.');
        expect(response.name).toBe('A Test World');
        expect(response._id).toBe(world_id);
        expect(res.status).toBe(200);
      },
    });
  });
  test('now querying for a different world should NOT return this world', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: new ObjectId(), // shouldn't exist
          },
        } as unknown as NextApiRequestWithAuth;

        await getWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(404);
      },
    });
  });
});
