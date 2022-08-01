import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { initLevel, initWorld } from '../../../../lib/initializeLocalDb';
import Level from '../../../../models/db/level';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ObjectId } from 'bson';
import World from '../../../../models/db/world';
import { WorldModel } from '../../../../models/mongoose';
import { enableFetchMocks } from 'jest-fetch-mock';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { testApiHandler } from 'next-test-api-route-handler';
import unpublishLevelHandler from '../../../../pages/api/unpublish/[id]';
import updateLevelHandler from '../../../../pages/api/level/[id]';
import updateWorldHandler from '../../../../pages/api/world/[id]';

afterAll(async() => {
  await dbDisconnect();
});

const USER_ID_FOR_TESTING = '600000000000000000000000';
const differentUser = '600000000000000000000006';

let userALevel1: Level, userALevel2: Level, userBLevel1: Level, userBLevel2: Level;
let userAWorld: World | null, userBWorld: World | null;

beforeAll(async () => {
  await dbConnect();
  userAWorld = await initWorld(USER_ID_FOR_TESTING, 'user A world');
  userBWorld = await initWorld(differentUser, 'user B world');
  userALevel1 = await initLevel(USER_ID_FOR_TESTING, 'user A level 1');
  userALevel2 = await initLevel(USER_ID_FOR_TESTING, 'user A level 2');
  userBLevel1 = await initLevel(differentUser, 'user B level 1');
  userBLevel2 = await initLevel(differentUser, 'user B level 2');
});
enableFetchMocks();
describe('Testing unpublish', () => {
  // set up levels
  // Create two worlds. one owned by USER_ID_FOR_TESTING and one owned by differentUser
  // in each world add three levels, two owns by the world owner and one owned by the other user
  test('Test wrong method for unpublish method', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: userALevel1._id,
          },

          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await unpublishLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);

      },
    });
  });
  test('adding 3 levels to two different worlds should work okay', async () => {

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: userAWorld?._id, // shouldn't exist
          },
          body: {
            levels: [userALevel1._id, userALevel2._id, userBLevel1._id],
            authorNote: 'added 3 levels',
            name: 'userA world'
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
        expect(response.levels.length).toBe(3);

      },
    });
    // now user B
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(differentUser),
          },
          query: {
            id: userBWorld?._id, // shouldn't exist
          },
          body: {
            levels: [userBLevel1._id, userBLevel2._id, userALevel1._id],
            authorNote: 'added 3 levels',
            name: 'userB world'
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
        expect(response.levels.length).toBe(3);

      },
    });
  });
  test('Unpublishing one of the levels should keep it in the level owners world but remove it from the other users world', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: userALevel1._id,
          },

          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await unpublishLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.updated).toBe(true);

        // Grab both worlds
        userAWorld = await WorldModel.findById(userAWorld?._id);
        userBWorld = await WorldModel.findById(userBWorld?._id);

        // Check to make sure that userALevel1 is in userAWorld but not in userBWorld
        expect((userAWorld?.levels as ObjectId[]).includes(userALevel1._id)).toBe(true);
        expect((userBWorld?.levels as ObjectId[]).includes(userALevel1._id)).toBe(false);

      },
    });
  });
  test('Deleting one of the levels should keep it in the level owners world but remove it from the other users world', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(differentUser),
          },
          query: {
            id: userBLevel1._id,
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

        // Grab both worlds
        userAWorld = await WorldModel.findById(userAWorld?._id);
        userBWorld = await WorldModel.findById(userBWorld?._id);

        // Check to make sure that userALevel1 is in userAWorld but not in userBWorld
        expect((userBWorld?.levels as ObjectId[]).includes(userBLevel1._id)).toBe(false);
        expect((userAWorld?.levels as ObjectId[]).includes(userBLevel1._id)).toBe(false);

      },

    });
  });
});
