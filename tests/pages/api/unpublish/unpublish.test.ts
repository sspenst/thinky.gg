import Direction from '@root/constants/direction';
import { DEFAULT_GAME_ID } from '@root/constants/GameId';
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
import { CollectionModel, LevelModel, StatModel, UserConfigModel } from '../../../../models/mongoose';
import updateCollectionHandler from '../../../../pages/api/collection/[id]';
import { processQueueMessages } from '../../../../pages/api/internal-jobs/worker';
import updateLevelHandler from '../../../../pages/api/level/[id]';
import statsHandler from '../../../../pages/api/stats/index';
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

  [userACollection, userBCollection, userALevel1, userALevel2, userBLevel1, userBLevel2] = await Promise.all([
    initCollection(TestId.USER, 'user A collection'),
    initCollection(TestId.USER_B, 'user B collection'),
    initLevel(DEFAULT_GAME_ID, TestId.USER, 'user A level 1'),
    initLevel(DEFAULT_GAME_ID, TestId.USER, 'user A level 2'),
    initLevel(DEFAULT_GAME_ID, TestId.USER_B, 'user B level 1'),
    initLevel(DEFAULT_GAME_ID, TestId.USER_B, 'user B level 2')
  ]);
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

        const userConfig = await UserConfigModel.findOne({ userId: TestId.USER });

        expect(userConfig?.calcLevelsCreatedCount).toEqual(3);

        const levelDeleted = await LevelModel.findOne({ _id: userALevel1._id });

        expect(levelDeleted.isDeleted).toBe(true);
        expect(levelDeleted.leastMoves).toBe(20);
        expect(levelDeleted.slug).toBe(userALevel1._id.toString());

        const levelClone = await LevelModel.findOne({ slug: userALevel1.slug });

        // Grab both collections
        [userACollection, userBCollection] = await Promise.all([CollectionModel.findById(userACollection?._id), CollectionModel.findById(userBCollection?._id)]);

        // Check to make sure that userALevel1 is in userACollection but not in userBCollection
        expect((userACollection?.levels as Types.ObjectId[]).includes(levelClone._id)).toBe(true);
        expect((userACollection?.levels as Types.ObjectId[]).includes(userALevel1._id)).toBe(false);
        expect((userBCollection?.levels as Types.ObjectId[]).includes(userALevel1._id)).toBe(false);

        expect(levelClone._id).not.toBe(userALevel1._id);
        expect(levelClone.calc_difficulty_estimate).toBe(-1);
        expect(levelClone.calc_playattempts_unique_users).toHaveLength(0);
        expect(levelClone.calc_playattempts_duration_sum).toBe(0);
        expect(levelClone.calc_playattempts_just_beaten_count).toBe(0);
        expect(levelClone.calc_reviews_count).toBe(0);
        expect(levelClone.calc_reviews_score_laplace.toFixed(2)).toBe('0.67');
        expect(levelClone.leastMoves).toBe(0);
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
  test('Unpublishing a level should update calc fields correctly', async () => {
    let userA = await UserConfigModel.findOne({ userId: TestId.USER, gameId: DEFAULT_GAME_ID });

    const initCompletedA = userA.calcLevelsCompletedCount;
    const initSolvedA = userA.calcLevelsSolvedCount;

    let userB = await UserConfigModel.findOne({ userId: TestId.USER_B, gameId: DEFAULT_GAME_ID });

    const initCompletedB = userB.calcLevelsCompletedCount;
    const initSolvedB = userB.calcLevelsSolvedCount;

    // optimal solve for user A
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            directions: [Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN, Direction.DOWN, Direction.DOWN],
            levelId: userALevel2._id,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await statsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        await processQueueMessages();
        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });

    // suboptimal solve for user B
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          body: {
            directions: [Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.LEFT, Direction.RIGHT, Direction.DOWN, Direction.DOWN, Direction.DOWN, Direction.DOWN],
            levelId: userALevel2._id,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await statsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        await processQueueMessages();
        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });

    userA = await UserConfigModel.findOne({ userId: TestId.USER, gameId: DEFAULT_GAME_ID });

    expect(userA.calcLevelsCompletedCount).toBe(initCompletedA + 1);
    expect(userA.calcLevelsSolvedCount).toBe(initSolvedA + 1);

    userB = await UserConfigModel.findOne({ userId: TestId.USER_B, gameId: DEFAULT_GAME_ID });

    expect(userB.calcLevelsCompletedCount).toBe(initCompletedB + 1);
    expect(userB.calcLevelsSolvedCount).toBe(initSolvedB);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: userALevel2._id,
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
      },
    });

    userA = await UserConfigModel.findOne({ userId: TestId.USER, gameId: DEFAULT_GAME_ID });

    expect(userA.calcLevelsCompletedCount).toBe(initCompletedA);
    expect(userA.calcLevelsSolvedCount).toBe(initSolvedA);

    userB = await UserConfigModel.findOne({ userId: TestId.USER_B, gameId: DEFAULT_GAME_ID });

    expect(userB.calcLevelsCompletedCount).toBe(initCompletedB);
    expect(userB.calcLevelsSolvedCount).toBe(initSolvedB);
  });
});
