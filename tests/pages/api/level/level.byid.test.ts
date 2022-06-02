import Level from '../../../../models/db/level';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ObjectId } from 'bson';
import createLevelHandler from '../../../../pages/api/level/index';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { enableFetchMocks } from 'jest-fetch-mock';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import getWorldHandler from '../../../../pages/api/world-by-id/[id]';
import modifyLevelHandler from '../../../../pages/api/level/[id]';
import { testApiHandler } from 'next-test-api-route-handler';

const USER_ID_FOR_TESTING = '600000000000000000000000';
const WORLD_ID_FOR_TESTING = '600000000000000000000001';
let level_id_1: string;
let level_id_2: string;
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('pages/api/level/index.ts', () => {
  test('Sending nothing should return 401', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          cookies: {
            token: '',
          },
        } as unknown as NextApiRequestWithAuth;
        await createLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        expect(res.status).toBe(401);
      },
    });
  });

  test('Doing a POST with no level data should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
        } as unknown as NextApiRequestWithAuth;
        await createLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        expect(response.error).toBe('Missing required fields');
        expect(res.status).toBe(400);
      },
    });
  });

  test('Doing a POST with level data should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            authorNote: 'I\'m a nice little note.',
            name: 'A Test Level',
            points: 0,
            worldIds: [WORLD_ID_FOR_TESTING],
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;
        await createLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        expect(response.success).toBe(true);
        level_id_1 = response._id;
        expect(res.status).toBe(200);
      },
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            authorNote: 'I\'m a mean little note.',
            name: 'A Second Test Level',
            points: 1,
            worldIds: [WORLD_ID_FOR_TESTING],
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;
        await createLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        expect(response.success).toBe(true);
        level_id_2 = response._id;
        expect(res.status).toBe(200);
      },
    });
  });

  test('Now we should be able to get the level', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: level_id_1,
          },
        } as unknown as NextApiRequestWithAuth;
        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        expect(response.authorNote).toBe('I\'m a nice little note.');
        expect(response.name).toBe('A Test Level');
        expect(response._id).toBe(level_id_1);
        expect(res.status).toBe(200);
      },
    });
  });
  // test('Now we should be able to get the level even if we aren\'t logged in', async () => {
  //   await testApiHandler({
  //     handler: async (_, res) => {
  //       const req: NextApiRequestWithAuth = {
  //         method: 'GET',
  //         query: {
  //           username: '',
  //           slugName: 'a-test-level',
  //         },
  //       } as unknown as NextApiRequestWithAuth;
  //       await getLevelBySlugHandler(req, res);
  //     },
  //     test: async ({ fetch }) => {
  //       const res = await fetch();
  //       const response = await res.json();
  //       expect(response.authorNote).toBe('I\'m a nice little note.');
  //       expect(response.name).toBe('A Test Level');
  //       expect(response._id).toBe(level_id_1);
  //       expect(res.status).toBe(200);
  //     },
  //   });
  // });

  test('getting a different level id shouldn\'t return anything', async () => {
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
        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        expect(res.status).toBe(404);
      },
    });
  });
  test('querying the world should not show draft levels in the level_ids array', async () => {
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
        const response_ids = response.levels.map((level: Level) => level._id);
        expect(response_ids).not.toContain(level_id_1);
        expect(response_ids).not.toContain(level_id_2);
        expect(response_ids.length).toBe(1);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Testing deleting a level. Deleting a level that doesn\'t exist should return a 404', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          headers: {
            'content-type': 'application/json',
          },
          query: {
            id: new ObjectId(), // shouldn't exist
          },
        } as unknown as NextApiRequestWithAuth;
        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        expect(res.status).toBe(404);
      },
    });
  });
  test('Deleting a level that DOES exist should work', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          userId: USER_ID_FOR_TESTING,
          headers: {
            'content-type': 'application/json',
          },
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: level_id_1, // shouldn't exist
          },
        } as unknown as NextApiRequestWithAuth;
        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        expect(response.updated).toBe(true);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Now fetching the worlds should return the level_ids array without the deleted level', async () => {
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
        const response_ids = response.levels.map((level: Level) => level._id);
        expect(response_ids).not.toContain(level_id_2);
        expect(response_ids.length).toBe(1); // By default this world has 2 levels
        expect(res.status).toBe(200);
      },
    });
  });
});
