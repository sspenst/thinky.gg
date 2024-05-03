import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import UserConfig from '@root/models/db/userConfig';
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
import { CollectionModel, LevelModel, UserConfigModel } from '../../../../models/mongoose';
import archiveLevelHandler from '../../../../pages/api/archive/[id]';
import { processQueueMessages } from '../../../../pages/api/internal-jobs/worker';

afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});

let userALevel1: Level;
let userACollection: Collection | null, userBCollection: Collection | null;

beforeAll(async () => {
  await dbConnect();
  [userACollection, userBCollection, userALevel1] = await Promise.all([
    initCollection(TestId.USER, 'user A collection'),
    initCollection(TestId.USER_B, 'user B collection'),
    initLevel(DEFAULT_GAME_ID, TestId.USER, 'user A level 1')
  ]);
});
enableFetchMocks();
describe('Testing archive', () => {
  // set up levels
  // Create two collections. one owned by TestId.USER and one owned by TestId.USER_B
  // in each collection add three levels, two owns by the collection owner and one owned by the other user
  test('Test wrong method for archive method', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      pagesHandler: async (_, res) => {
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

        await archiveLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('POST with transaction error', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(LevelModel, 'findOneAndUpdate').mockImplementationOnce(() => {
      throw new Error('Test error');
    });
    await testApiHandler({
      pagesHandler: async (_, res) => {
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

        await archiveLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Internal server error');
        expect(res.status).toBe(500);
      },

    });
  });
  test('Archiving one of the levels should remove it from all collections', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
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

        await archiveLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        await processQueueMessages();
        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response._id).toBe(userALevel1._id.toString());

        const userConfig = await UserConfigModel.findOne<UserConfig>({ userId: new Types.ObjectId(TestId.USER) });

        expect(userConfig?.calcLevelsCreatedCount).toEqual(2);

        const level = await LevelModel.findOne({ _id: userALevel1._id });

        expect(level.archivedBy.toString()).toBe(TestId.USER);
        expect(level.slug).toBe('archive/user-a-level-1');
        expect(level.userId.toString()).toBe(TestId.ARCHIVE);

        // Grab both collections
        userACollection = await CollectionModel.findById(userACollection?._id);
        userBCollection = await CollectionModel.findById(userBCollection?._id);

        // Check to make sure that userALevel1 is in userACollection but not in userBCollection
        expect((userACollection?.levels as Types.ObjectId[]).includes(level._id)).toBe(false);
        expect((userACollection?.levels as Types.ObjectId[]).includes(userALevel1._id)).toBe(false);
        expect((userBCollection?.levels as Types.ObjectId[]).includes(userALevel1._id)).toBe(false);

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
  test('Archiving unknown level should fail', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
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

        await archiveLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Level not found');
        expect(res.status).toBe(404);
      },

    });
  });
  test('Archiving a level that does not belong to you should fail', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
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

        await archiveLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Not authorized to delete this Level');
        expect(res.status).toBe(401);
      },

    });
  });
});
