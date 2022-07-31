import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { LevelModel } from '../../../../models/mongoose';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ObjectId } from 'bson';
import { enableFetchMocks } from 'jest-fetch-mock';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import getTs from '../../../../helpers/getTs';
import getWorldHandler from '../../../../pages/api/world-by-id/[id]';
import { testApiHandler } from 'next-test-api-route-handler';
import updateLevelHandler from '../../../../pages/api/level/[id]';
import updateWorldHandler from '../../../../pages/api/world/[id]';

afterAll(async() => {
  await dbDisconnect();
});

const USER_ID_FOR_TESTING = '600000000000000000000000';
const differentUser = '600000000000000000000006';
const WORLD_ID_FOR_TESTING = '600000000000000000000001';

const levels: ObjectId[] = [];
const numLevels = 10;
let toRemove: ObjectId;

enableFetchMocks();
describe('Testing updating world data', () => {

  test('Adding/publishing 10 levels manually should not error', async () => {
    await dbConnect();

    for (let i = 0; i < numLevels; i++) {
      const ts = getTs();

      levels[i] = new ObjectId();
      const response = await LevelModel.create({
        _id: levels[i],
        authorNote: 'test level 1 author note',
        data: '40010\n12000\n05000\n67890\nABCD3',
        height: 5,
        isDraft: false,
        leastMoves: 20,
        name: 'level ' + i,
        points: 0,
        ts: ts,
        userId: USER_ID_FOR_TESTING,
        width: 5,
      });

      expect(response).toBeDefined();
    }
  }, 30000);
  test('querying for the world should return this world and the single level in it', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: WORLD_ID_FOR_TESTING, // shouldn't exist
          },
        } as unknown as NextApiRequestWithAuth;

        await getWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
        const response = await res.json();

        expect(response.levels).toBeDefined();
        expect(response.levels.length).toBe(1);
      },
    });
  });
  test('SETTING the 10 created levels to the world when trying with a different logged (that does not own the world) in user should NOT work', async () => {

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: differentUser,
          cookies: {
            token: getTokenCookieValue(differentUser),
          },
          query: {
            id: WORLD_ID_FOR_TESTING, // shouldn't exist
          },
          body: {
            levels: levels.map(levelId => levelId.toString()),
            authorNote: 'added 100 levels',
            name: 'the big world'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await updateWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.updated).toBeUndefined();
        expect(response.error).toBe('User is not authorized to perform this action');
        expect(res.status).toBe(401);

      },
    });
  });
  test('querying for the world after trying to change it from a different user should STILL return this world and the single level in it', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: WORLD_ID_FOR_TESTING, // shouldn't exist
          },
        } as unknown as NextApiRequestWithAuth;

        await getWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
        const response = await res.json();

        expect(response.levels).toBeDefined();
        expect(response.levels.length).toBe(1);
      },
    });
  });
  test('now we SET the 10 created levels to the world', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: WORLD_ID_FOR_TESTING, // shouldn't exist
          },
          body: {
            levels: levels.map(levelId => levelId.toString()),
            authorNote: 'added 100 levels',
            name: 'the big world'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await updateWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);

        expect(response.levels).toBeDefined();
        expect(response.levels.length).toBe(numLevels);

        for (let i = 0; i < numLevels; i++) {
          expect(response.levels[i]._id).toBe(levels[i].toString());
        }
      },
    });
  });
  test('querying for the world after SETTING 10 levels should return this world and the 10 levels in it (without the one that was original there)', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: WORLD_ID_FOR_TESTING, // shouldn't exist
          },
        } as unknown as NextApiRequestWithAuth;

        await getWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
        const response = await res.json();

        expect(response.levels).toBeDefined();
        expect(response.levels.length).toBe(numLevels);

        for (let i = 0; i < numLevels; i++) {
          expect(response.levels[i]._id).toBe(levels[i].toString());
        }
      },
    });
  });
  test('now we SET the 10 created levels AGAIN but this time we swap first and last item of levels', async () => {
    const tmp = levels[0];

    levels[0] = levels[levels.length - 1];
    levels[levels.length - 1] = tmp;

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: WORLD_ID_FOR_TESTING, // shouldn't exist
          },
          body: {
            levels: levels.map(levelId => levelId.toString()),
            authorNote: 'added 100 levels',
            name: 'the big world'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await updateWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);

        expect(response.levels).toBeDefined();
        expect(response.levels.length).toBe(numLevels);

        for (let i = 0; i < numLevels; i++) {
          expect(response.levels[i]._id).toBe(levels[i].toString());
        }
      },
    });
  });
  test('querying for the world after setting 10 levels (after the first and last level have been swapped) should return this world and the 10 levels in the new order', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: WORLD_ID_FOR_TESTING, // shouldn't exist
          },
        } as unknown as NextApiRequestWithAuth;

        await getWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
        const response = await res.json();

        expect(response.levels).toBeDefined();
        expect(response.levels.length).toBe(numLevels);

        for (let i = 0; i < numLevels; i++) {
          expect(response.levels[i]._id).toBe(levels[i].toString());
        }
      },
    });
  });
  test('Manually removing a level from a world', async () => {
    toRemove = levels[5];

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: toRemove.toString(),
          },
          body: {
            name: 'removed level',
            authorNote: 'removed level note',
            points: 1,
            worldIds: [],
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await updateLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.updated).toBe(true);
      },
    });
  });
  test('querying for the world after removing one of the levels should return all the levels minus the level removed', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: USER_ID_FOR_TESTING,
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: WORLD_ID_FOR_TESTING, // shouldn't exist
          },
        } as unknown as NextApiRequestWithAuth;

        await getWorldHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
        const response = await res.json();

        expect(response.levels).toBeDefined();
        expect(response.levels).not.toContain(toRemove);
        // remove toRemove from levels
        const levelsWithoutLevel = levels.filter(level => level.toString() !== toRemove.toString());

        expect(response.levels.length).toBe(levelsWithoutLevel.length);

        for (let i = 0; i < response.levels.length; i++) {
          expect(response.levels[i]._id).toBe(levelsWithoutLevel[i].toString());
        }

      },
    });
  });
});
