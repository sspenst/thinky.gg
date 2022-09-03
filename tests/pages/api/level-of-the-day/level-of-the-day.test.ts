import { ObjectId } from 'bson';
import { enableFetchMocks } from 'jest-fetch-mock';
import { NextApiRequest } from 'next';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import { TimerUtil } from '../../../../helpers/getTs';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { KeyValueModel, LevelModel } from '../../../../models/mongoose';
import handler, { getLevelOfDayKVKey, KV_LEVEL_OF_DAY_KEY_PREFIX, KV_LEVEL_OF_DAY_LIST } from '../../../../pages/api/level-of-the-day/index';

afterEach(() => {
  jest.restoreAllMocks();
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
  headers: {
    'Content-Type': 'application/json',
  },
};

const MOCK_DATE = new Date('2021-01-01T00:00:00.000Z');

describe('GET /api/level-of-the-day', () => {
  test('should return 200', async () => {
    // Artifically increase calc_playattempts_duration_sum to make it more likely to be selected
    const updated = await LevelModel.updateOne({
      _id: TestId.LEVEL,
    }, {
      $set: {
        calc_playattempts_duration_sum: 31,
        calc_stats_players_beaten: 1,
        calc_reviews_count: 3,
        calc_playattempts_unique_users: Array.from({ length: 11 }, () => new ObjectId()),
        calc_reviews_score_laplace: 0.8,
      },
    });
    const updated2 = await LevelModel.updateOne({
      _id: TestId.LEVEL_2,
    }, {
      $set: {
        isDraft: false,
        leastMoves: 99,
        calc_playattempts_duration_sum: 41,
        calc_stats_players_beaten: 1,
        calc_reviews_count: 3,
        calc_playattempts_unique_users: Array.from({ length: 11 }, () => new ObjectId()),
        calc_reviews_score_laplace: 0.78,
      },
    });

    expect(updated.modifiedCount).toBe(1);
    expect(updated2.modifiedCount).toBe(1);
    jest.spyOn(TimerUtil, 'getTs').mockImplementation(() => (MOCK_DATE.getTime()) / 1000);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          ...DefaultReq,
        } as unknown as NextApiRequest;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response._id).toBe(TestId.LEVEL);

        const curLevelOfDayKey = getLevelOfDayKVKey();

        expect(curLevelOfDayKey).toBe('level-of-the-day-2021-01-01');
        const lvlOfDay = await KeyValueModel.findOne({
          key: curLevelOfDayKey,
        });

        expect(lvlOfDay).toBeDefined();
        expect(lvlOfDay?.value).toStrictEqual(new ObjectId(TestId.LEVEL));
      },
    });
  });
  test('calling it twice should return the same level', async () => {
    // Artifically increase calc_playattempts_duration_sum to make it more likely to be selected
    jest.spyOn(TimerUtil, 'getTs').mockImplementation(() => (MOCK_DATE.getTime()) / 1000);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          ...DefaultReq,
        } as unknown as NextApiRequest;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response._id).toBe(TestId.LEVEL);
        const curLevelOfDayKey = getLevelOfDayKVKey();

        expect(curLevelOfDayKey).toBe('level-of-the-day-2021-01-01');
        const lvlOfDay = await KeyValueModel.findOne({
          key: curLevelOfDayKey,
        });

        expect(lvlOfDay).toBeDefined();
        expect(lvlOfDay?.value).toStrictEqual(new ObjectId(TestId.LEVEL));
      },
    });
  });
  test('changing to the next day should return the a different level', async () => {
    jest.spyOn(TimerUtil, 'getTs').mockImplementation(() => (MOCK_DATE.getTime() + 86400000) / 1000);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          ...DefaultReq,
        } as unknown as NextApiRequest;

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

        expect(curLevelOfDayKey).toBe('level-of-the-day-2021-01-02');
        const lvlOfDay = await KeyValueModel.findOne({
          key: curLevelOfDayKey,
        });

        expect(lvlOfDay).toBeDefined();
        expect(lvlOfDay?.value).toStrictEqual(new ObjectId(TestId.LEVEL_2));
        const list = await KeyValueModel.find({ key: KV_LEVEL_OF_DAY_LIST });

        expect(list.length).toBe(1);
        expect(list[0].value).toEqual([new ObjectId(TestId.LEVEL), new ObjectId(TestId.LEVEL_2)]);
      },
    });
  });
  test('changing to the third day should return an error since we are out of levels', async () => {
    jest.spyOn(TimerUtil, 'getTs').mockImplementation(() => (MOCK_DATE.getTime() + 86400000 * 2) / 1000);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          ...DefaultReq,
        } as unknown as NextApiRequest;

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
    jest.spyOn(TimerUtil, 'getTs').mockImplementation(() => (MOCK_DATE.getTime() + 86400000) / 1000);
    await LevelModel.deleteOne({
      _id: TestId.LEVEL_2,
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          ...DefaultReq,
        } as unknown as NextApiRequest;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(404);
        expect(response.error).toBe('Level of the day not found');
      },
    });
  });
});
