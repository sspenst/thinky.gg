import { LevelModel, ReviewModel } from '../../../../models/mongoose';

import Level from '../../../../models/db/level';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ObjectId } from 'bson';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { enableFetchMocks } from 'jest-fetch-mock';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import getTs from '../../../../helpers/getTs';
import { initLevel } from '../../../../lib/initializeLocalDb';
import levelsHandler from '../../../../pages/api/levels/index';
import { testApiHandler } from 'next-test-api-route-handler';

const USER_ID_FOR_TESTING = '600000000000000000000000';
const LEVEL_ID_FOR_TESTING = '600000000000000000000002';
const differentUser = '600000000000000000000006';

afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Testing levels token handler', () => {
  test('Calling with wrong http method should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await levelsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Calling with correct http method should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: LEVEL_ID_FOR_TESTING,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await levelsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.length).toBe(2);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Calc datas should reflect correctly on update', async () => {
    const lvl:Level = await initLevel(USER_ID_FOR_TESTING, 'bob');

    await ReviewModel.create({
      _id: new ObjectId(),
      userId: USER_ID_FOR_TESTING,
      levelId: lvl._id.toString(),
      score: 4,
      ts: getTs()
    });
    const updated = await LevelModel.findById(lvl._id);

    expect(updated.calc_reviews_score_laplace.toFixed(2)).toBe('0.39');
    expect(updated.calc_reviews_score_count).toBe(4);
    await ReviewModel.create({
      _id: new ObjectId(),
      userId: differentUser,
      levelId: lvl._id.toString(),
      score: 4,
      ts: getTs()
    });
    const updated2 = await LevelModel.findById(lvl._id);

    expect(updated2.calc_reviews_score_laplace.toFixed(2)).toBe('0.40');
    expect(updated2.calc_reviews_score_count).toBe(5);

  });
  test('If mongo query returns null we should fail gracefully', async () => {

    jest.spyOn(LevelModel, 'find').mockReturnValueOnce({
      sort: function() {
        return null;
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: LEVEL_ID_FOR_TESTING,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await levelsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding Levels');
        expect(res.status).toBe(500);
      },
    });
  });
  test('If mongo query throw exception we should fail gracefully', async () => {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(LevelModel, 'find').mockReturnValueOnce({ 'thisobjectshouldthrowerror': true } as any);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          query: {
            id: LEVEL_ID_FOR_TESTING,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await levelsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding Levels');
        expect(res.status).toBe(500);
      },
    });
  });
});
