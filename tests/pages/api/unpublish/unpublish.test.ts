import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { initCollection, initLevel } from '../../../../lib/initializeLocalDb';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import Collection from '../../../../models/db/collection';
import Level from '../../../../models/db/level';
import { CollectionModel, LevelModel, StatModel, UserModel } from '../../../../models/mongoose';
import updateCollectionHandler from '../../../../pages/api/collection/[id]';
import { processQueueMessages } from '../../../../pages/api/internal-jobs/worker';
import updateLevelHandler from '../../../../pages/api/level/[id]';
import unpublishLevelHandler from '../../../../pages/api/unpublish/[id]';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
enableFetchMocks();

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
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

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
  test('POST with transaction error', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(StatModel, 'find').mockImplementationOnce(() => {
      throw new Error('Test error');
    });
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

        expect(response.error).toBe('Internal server error');
        expect(res.status).toBe(500);
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

        await processQueueMessages();
        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.updated).toBe(true);

        const user = await UserModel.findById(TestId.USER);

        expect(user?.calc_levels_created_count).toEqual(3);

        const levelDeleted = await LevelModel.findOne({ _id: userALevel1._id });

        expect(levelDeleted.isDeleted).toBe(true);
        expect(levelDeleted.slug).toBe(userALevel1._id.toString());

        const levelClone = await LevelModel.findOne({ slug: userALevel1.slug });

        // Grab both collections
        userACollection = await CollectionModel.findById(userACollection?._id);
        userBCollection = await CollectionModel.findById(userBCollection?._id);

        // Check to make sure that userALevel1 is in userACollection but not in userBCollection
        expect((userACollection?.levels as Types.ObjectId[]).includes(levelClone._id)).toBe(true);
        expect((userACollection?.levels as Types.ObjectId[]).includes(userALevel1._id)).toBe(false);
        expect((userBCollection?.levels as Types.ObjectId[]).includes(userALevel1._id)).toBe(false);

        const level = await LevelModel.findOne({ slug: userALevel1.slug });

        expect(level._id).not.toBe(userALevel1._id);
        expect(level.calc_difficulty_estimate).toBe(-1);
        expect(level.calc_playattempts_unique_users).toHaveLength(0);
        expect(level.calc_playattempts_duration_sum).toBe(0);
        expect(level.calc_playattempts_just_beaten_count).toBe(0);
        expect(level.calc_reviews_count).toBe(0);
        expect(level.calc_reviews_score_laplace.toFixed(2)).toBe('0.67');
      },
    });
  });
  test('Unpublishing unknown level should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: new Types.ObjectId(),
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

        expect(response.error).toBe('Level not found');
        expect(res.status).toBe(404);
      },

    });
  });
  test('Unpublishing a level that does not belong to you should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: TestId.LEVEL_3,
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

        expect(response.error).toBe('Not authorized to delete this Level');
        expect(res.status).toBe(401);
      },

    });
  });
  test('Deleting a level should remove it from all collections', async () => {
    let newLevelId = '';

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
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

        await unpublishLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        newLevelId = response.levelId;
      },

    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: newLevelId as string,
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
        expect((userBCollection?.levels as Types.ObjectId[]).includes(new Types.ObjectId(newLevelId))).toBe(false);
        expect((userACollection?.levels as Types.ObjectId[]).includes(new Types.ObjectId(newLevelId))).toBe(false);
      },

    });
  });
});
