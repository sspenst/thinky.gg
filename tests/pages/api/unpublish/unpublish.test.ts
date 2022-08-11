import { ObjectId } from 'bson';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { initCollection, initLevel } from '../../../../lib/initializeLocalDb';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import Collection from '../../../../models/db/collection';
import Level from '../../../../models/db/level';
import { CollectionModel } from '../../../../models/mongoose';
import updateCollectionHandler from '../../../../pages/api/collection/[id]';
import updateLevelHandler from '../../../../pages/api/level/[id]';
import unpublishLevelHandler from '../../../../pages/api/unpublish/[id]';

afterAll(async() => {
  await dbDisconnect();
});

let userALevel1: Level, userALevel2: Level, userBLevel1: Level, userBLevel2: Level;
let userACollection: Collection | null, userBCollection: Collection | null;

beforeAll(async () => {
  await dbConnect();
  userACollection = await initCollection(TestId.USER, 'user A collection');
  userBCollection = await initCollection(TestId.USER_B, 'user B collection');
  userALevel1 = await initLevel(TestId.USER, 'user A level 1');
  userALevel2 = await initLevel(TestId.USER, 'user A level 2');
  userBLevel1 = await initLevel(TestId.USER_B, 'user B level 1');
  userBLevel2 = await initLevel(TestId.USER_B, 'user B level 2');
});
enableFetchMocks();
describe('Testing unpublish', () => {
  // set up levels
  // Create two collections. one owned by TestId.USER and one owned by TestId.USER_B
  // in each collection add three levels, two owns by the collection owner and one owned by the other user
  test('Test wrong method for unpublish method', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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
  test('adding 3 levels to two different collections should work okay', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: userACollection?._id, // shouldn't exist
          },
          body: {
            levels: [userALevel1._id, userALevel2._id, userBLevel1._id],
            authorNote: 'added 3 levels',
            name: 'userA collection'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await updateCollectionHandler(req, res);
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
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: userBCollection?._id, // shouldn't exist
          },
          body: {
            levels: [userBLevel1._id, userBLevel2._id, userALevel1._id],
            authorNote: 'added 3 levels',
            name: 'userB collection'
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await updateCollectionHandler(req, res);
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
  test('Unpublishing one of the levels should keep it in the level owners collection but remove it from the other users collection', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        // Grab both collections
        userACollection = await CollectionModel.findById(userACollection?._id);
        userBCollection = await CollectionModel.findById(userBCollection?._id);

        // Check to make sure that userALevel1 is in userACollection but not in userBCollection
        expect((userACollection?.levels as ObjectId[]).includes(userALevel1._id)).toBe(true);
        expect((userBCollection?.levels as ObjectId[]).includes(userALevel1._id)).toBe(false);
      },
    });
  });
  test('Deleting one of the levels should keep it in the level owners collection but remove it from the other users collection', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
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

        // Grab both collections
        userACollection = await CollectionModel.findById(userACollection?._id);
        userBCollection = await CollectionModel.findById(userBCollection?._id);

        // Check to make sure that userALevel1 is in userACollection but not in userBCollection
        expect((userBCollection?.levels as ObjectId[]).includes(userBLevel1._id)).toBe(false);
        expect((userACollection?.levels as ObjectId[]).includes(userBLevel1._id)).toBe(false);
      },

    });
  });
});
