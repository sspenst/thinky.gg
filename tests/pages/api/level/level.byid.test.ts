import Level from '../../../../models/db/level';
import { LevelModel } from '../../../../models/mongoose';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ObjectId } from 'bson';
import createLevelHandler from '../../../../pages/api/level/index';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { enableFetchMocks } from 'jest-fetch-mock';
import getCollectionHandler from '../../../../pages/api/collection-by-id/[id]';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import getTs from '../../../../helpers/getTs';
import modifyLevelHandler from '../../../../pages/api/level/[id]';
import { testApiHandler } from 'next-test-api-route-handler';

const differentUser = '600000000000000000000006';

const USER_ID_FOR_TESTING = '600000000000000000000000';
const COLLECTION_ID_FOR_TESTING = '600000000000000000000001';
let level_id_1: string;
let level_id_2: string;

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('pages/api/level/index.ts', () => {
  test('Wrong http method should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
        } as unknown as NextApiRequestWithAuth;

        await createLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
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
  test('Doing a POST with partial data should NOT be OK', async () => {
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
            // missing points
            collectionIds: [COLLECTION_ID_FOR_TESTING],
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

        expect(response.error).toBe('Missing required fields');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a POST with invalid points data should NOT be OK', async () => {
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
            points: 11,
            collectionIds: [COLLECTION_ID_FOR_TESTING],
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

        expect(response.error).toBe('Points must be a number between 0-10');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a POST when the DB errors out should be handled gracefully', async () => {
    jest.spyOn(LevelModel, 'create').mockImplementationOnce(() => {
      throw new Error('DB Error');
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
            authorNote: 'I\'m a nice little note.',
            name: 'A Test Level',
            points: 5,
            collectionIds: [COLLECTION_ID_FOR_TESTING],
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

        expect(response.error).toBe('Error creating level');
        expect(res.status).toBe(500);
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
            collectionIds: [COLLECTION_ID_FOR_TESTING],
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
            collectionIds: [COLLECTION_ID_FOR_TESTING],
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
  test('querying the collection should not show draft levels in the level_ids array', async () => {
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
        const response_ids = response.levels.map((level: Level) => level._id);

        expect(response_ids).not.toContain(level_id_1);
        expect(response_ids).not.toContain(level_id_2);
        expect(response_ids.length).toBe(1);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Doing a PATCH HTTP method for the edit level should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PATCH',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: level_id_1,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Doing a PUT with no body should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: level_id_1,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required fields');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a PUT with partial data should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            authorNote: 'I\'m a nice little note.',
            // missing name
            points: 0,
            collectionIds: [COLLECTION_ID_FOR_TESTING],
          },
          query: {
            id: level_id_1,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required fields');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a PUT with no body should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: level_id_1,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required fields');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a PUT with points out of bounds should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            authorNote: 'I\'m a nice little note.',
            name: 'A Test Level',
            points: 11,
            collectionIds: [COLLECTION_ID_FOR_TESTING],
          },
          query: {
            id: level_id_1,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Points must be a number between 0-10');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a PUT with correct data should work', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            authorNote: 'I\'m a changed nice little note.',
            name: 'A Change Test Level',
            points: 7,
            collectionIds: [COLLECTION_ID_FOR_TESTING],
          },
          query: {
            id: level_id_1,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(level_id_1);

        expect(lvl.authorNote).toBe('I\'m a changed nice little note.');
        expect(lvl.name).toBe('A Change Test Level');
        expect(lvl.points).toBe(7);
      },
    });
  });
  test('Testing deleting a level. Deleting a level that doesn\'t exist should return a 404', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
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
  test('Deleting a level that DOES exist that YOU do not own should not work', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          headers: {
            'content-type': 'application/json',
          },
          cookies: {
            token: getTokenCookieValue(differentUser),
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

        expect(response.error).toBe('Not authorized to delete this Level');
        expect(res.status).toBe(401);
      },
    });
  });
  test('Deleting a draft level that DOES exist that you own should work', async () => {
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
            id: level_id_1,
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
  test('Deleting a published level that DOES exist that YOU own should work', async () => {
    const test_level_id = new ObjectId();

    await LevelModel.create({
      _id: test_level_id,
      authorNote: 'test level X author note',
      data: '40000\n12000\n05000\n67890\nABCD3',
      height: 5,
      isDraft: false,
      leastMoves: 20,
      name: 'test level 1',
      points: 0,
      ts: getTs(),
      userId: USER_ID_FOR_TESTING,
      width: 5,
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          headers: {
            'content-type': 'application/json',
          },
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: test_level_id,
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
  });
  test('Now fetching the collections should return the level_ids array without the deleted level', async () => {
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
        const response_ids = response.levels.map((level: Level) => level._id);

        expect(response_ids).not.toContain(level_id_2);
        expect(response_ids.length).toBe(1); // By default this collection has 2 levels
        expect(res.status).toBe(200);
      },
    });
  });
});
