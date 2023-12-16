import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { NextApiRequestWrapper } from '@root/helpers/apiWrapper';
import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { EnrichedLevel } from '../../../../models/db/level';
import { KeyValueModel, LevelModel } from '../../../../models/mongoose';
import handler, { getLevelOfDayKVKey, KV_LEVEL_OF_DAY_LIST } from '../../../../pages/api/level-of-day';

afterEach(() => {
  jest.restoreAllMocks();
  MockDate.reset();
});
beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

const DefaultReq = {
  method: 'GET',
  gameId: DEFAULT_GAME_ID,
  headers: {
    'Content-Type': 'application/json',
  },
};

const MOCK_DATE = new Date('2021-01-11T03:00:00.000Z'); // test a date on a sunday to handle more test cases

describe('GET /api/level-of-day', () => {
  test('should return 200', async () => {
    // Artifically increase calc_playattempts_duration_sum to make it more likely to be selected
    MockDate.set(MOCK_DATE);

    const updated = await LevelModel.updateOne({
      _id: TestId.LEVEL_3,
    }, {
      $set: {
        isDraft: false,
        calc_difficulty_estimate: 31,
        calc_playattempts_duration_sum: 31,
        calc_playattempts_just_beaten_count: 1,
        calc_reviews_count: 3,
        calc_playattempts_unique_users: Array.from({ length: 11 }, () => new Types.ObjectId()),
        calc_reviews_score_laplace: 0.8,
      },
    });
    const updated2 = await LevelModel.updateOne({
      _id: TestId.LEVEL_2,
    }, {
      $set: {
        isDraft: false,
        leastMoves: 99,
        calc_difficulty_estimate: 41,
        calc_playattempts_duration_sum: 41,
        calc_playattempts_just_beaten_count: 1,
        calc_reviews_count: 3,
        calc_playattempts_unique_users: Array.from({ length: 11 }, () => new Types.ObjectId()),
        calc_reviews_score_laplace: 0.78,
      },
    });

    expect(updated.modifiedCount).toBe(1);
    expect(updated2.modifiedCount).toBe(1);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          ...DefaultReq,
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);

        expect(response._id).toBe(TestId.LEVEL_3);

        const curLevelOfDayKey = getLevelOfDayKVKey();

        expect(curLevelOfDayKey).toBe('level-of-day-2021-01-11');
        const lvlOfDay = await KeyValueModel.findOne({
          key: curLevelOfDayKey,
        });

        expect(lvlOfDay).toBeDefined();
        expect(lvlOfDay.gameId).toBe(DEFAULT_GAME_ID);
        expect(lvlOfDay?.value).toStrictEqual(new Types.ObjectId(TestId.LEVEL_3));
      },
    });
  });
  test('calling it twice should return the same level', async () => {
    MockDate.set(MOCK_DATE);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          ...DefaultReq,
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response._id).toBe(TestId.LEVEL_3);
        const curLevelOfDayKey = getLevelOfDayKVKey();

        expect(curLevelOfDayKey).toBe('level-of-day-2021-01-11');
        const lvlOfDay = await KeyValueModel.findOne({
          key: curLevelOfDayKey,
        });

        expect(lvlOfDay).toBeDefined();
        expect(lvlOfDay?.value).toStrictEqual(new Types.ObjectId(TestId.LEVEL_3));
      },
    });
  });
  test('calling it while authenticated should return the same level but with enriched data', async () => {
    MockDate.set(MOCK_DATE);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          ...DefaultReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          }
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response._id).toBe(TestId.LEVEL_3);
        const asEnriched = response as EnrichedLevel;

        expect(asEnriched.userMoves).toBe(80);
        const curLevelOfDayKey = getLevelOfDayKVKey();

        expect(curLevelOfDayKey).toBe('level-of-day-2021-01-11');
        const lvlOfDay = await KeyValueModel.findOne({
          key: curLevelOfDayKey,
        });

        expect(lvlOfDay).toBeDefined();
        expect(lvlOfDay?.value).toStrictEqual(new Types.ObjectId(TestId.LEVEL_3));
      },
    });
  });
  test('changing to the next day but throw a db exception (test that transaction works correctly!)', async () => {
    MockDate.set(MOCK_DATE);
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const day2 = Date.now() + (1000 * 60 * 60 * 24 ); // Note... Date.now() here is being mocked each time too!

    MockDate.set(day2);

    jest.spyOn(KeyValueModel, 'updateOne').mockImplementationOnce(KeyValueModel.updateOne);
    jest.spyOn(KeyValueModel, 'updateOne').mockImplementationOnce(() => {
      throw new Error('test');
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          ...DefaultReq,
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error getting level of the day');
        expect(res.status).toBe(500);

        //
        const curLevelOfDayKey = getLevelOfDayKVKey();

        expect(curLevelOfDayKey).toBe('level-of-day-2021-01-12');
        const lvlOfDay = await KeyValueModel.findOne({
          key: curLevelOfDayKey,
        });

        expect(lvlOfDay).toBeDefined();
        expect(lvlOfDay?.value).toBeUndefined();
        const list = await KeyValueModel.find({ key: KV_LEVEL_OF_DAY_LIST });

        expect(list.length).toBe(1);
        expect(list[0].value).toEqual([new Types.ObjectId(TestId.LEVEL_3)]);
      },
    });
  });
  test('changing to the next day should return the a different level', async () => {
    MockDate.set(MOCK_DATE);
    const day2 = Date.now() + (1000 * 60 * 60 * 24 ); // Note... Date.now() here is being mocked each time too!

    MockDate.set(day2);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          ...DefaultReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          }
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response._id).toBe(TestId.LEVEL_2);

        //
        const curLevelOfDayKey = getLevelOfDayKVKey();

        expect(curLevelOfDayKey).toBe('level-of-day-2021-01-12');
        const lvlOfDay = await KeyValueModel.findOne({
          key: curLevelOfDayKey,
        });

        expect(lvlOfDay).toBeDefined();
        expect(lvlOfDay?.value).toStrictEqual(new Types.ObjectId(TestId.LEVEL_2));
        const list = await KeyValueModel.find({ key: KV_LEVEL_OF_DAY_LIST });

        expect(list.length).toBe(1);
        expect(list[0].value).toEqual([new Types.ObjectId(TestId.LEVEL_3), new Types.ObjectId(TestId.LEVEL_2)]);
      },
    });
  });
  test('changing to the third day should return an error since we are out of levels', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    MockDate.set(MOCK_DATE);
    const day3 = Date.now() + (1000 * 60 * 60 * 24 * 2); // Note... Date.now() here is being mocked each time too!

    MockDate.set(day3);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          ...DefaultReq,
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error getting level of the day');
        expect(res.status).toBe(500);
      },
    });
  });

  test('going back to the second day should but deleting the level that was there originally (rare) should 404', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    MockDate.set(MOCK_DATE);
    const day2 = Date.now() + (1000 * 60 * 60 * 24 ); // Note... Date.now() here is being mocked each time too!

    MockDate.set(day2);

    await LevelModel.deleteOne({
      _id: TestId.LEVEL_2,
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          ...DefaultReq,
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(500);
        expect(response.error).toBe('Error getting level of the day');
      },
    });
  });
});
