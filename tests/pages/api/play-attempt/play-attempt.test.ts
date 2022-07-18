import { LevelModel, PlayAttemptModel } from '../../../../models/mongoose';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ObjectId } from 'bson';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { enableFetchMocks } from 'jest-fetch-mock';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import handler from '../../../../pages/api/play-attempt/index';
import { testApiHandler } from 'next-test-api-route-handler';
import statsHandler from '../../../../pages/api/stats/index';
import getTs from '../../../../helpers/getTs';
import PlayAttemptSchema from '../../../../models/schemas/playAttemptSchema';
import PlayAttempt from '../../../../models/db/PlayAttempt';
import { calcPlayAttempts } from '../../../../models/schemas/levelSchema';

const USER_ID_FOR_TESTING = '600000000000000000000000';
const LEVEL_ID_FOR_TESTING = '600000000000000000000002';
const differentUser = '600000000000000000000006';

afterAll(async () => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
enableFetchMocks();
const MINUTE = 60;

describe('Testing stats api', () => {
  test('Wrong HTTP method should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PATCH',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Doing a POST with no body should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a POST with a body but no params should error', async () => {
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

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a POST with an invalid level should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            levelId: new ObjectId()
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Level not found');
        expect(res.status).toBe(404);
      },
    });
  });
  let playAttemptId = new ObjectId();

  test('Doing a POST should work', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            levelId: LEVEL_ID_FOR_TESTING
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        const playAttempt = await PlayAttemptModel.findById(response.playAttempt);

        expect(res.status).toBe(200);
        expect(response.message).toBe('created');
        playAttemptId = response.playAttempt;
      },
    });
  });
  test('Doing a second POST 5 minutes later should work by update', async () => {
    const playAttempt = await PlayAttemptModel.findById(playAttemptId);
    const actual = jest.requireActual('../../../../helpers/getTs');

    jest.spyOn(actual, 'default').mockReturnValue(playAttempt.endTime + 5 * 60);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            levelId: LEVEL_ID_FOR_TESTING
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.message).toBe('updated');
        expect(response.playAttempt).toBeDefined();

        const playAttempt = await PlayAttemptModel.findById(response.playAttempt);
        // there should be two play attempts in the db now for this level
        const playAttempts = await PlayAttemptModel.find({
          levelId: LEVEL_ID_FOR_TESTING,
        });

        expect(playAttempts.length).toBe(1);
        expect(playAttempt.updateCount).toBe(1);
        expect((playAttempt.endTime - playAttempt.startTime) / 60.0).toBe(5.0);

        // get the level
        const level = await LevelModel.findById(LEVEL_ID_FOR_TESTING);

        expect(level.calc_playattempts_count).toBe(1);
        expect(level.calc_playattempts_duration_sum).toBe(5 * MINUTE);

      },
    });
  });
  test('Doing a third POST "17 minutes later" should now give a create', async () => {
    const playAttempt = await PlayAttemptModel.findById(playAttemptId);
    const actual = jest.requireActual('../../../../helpers/getTs');

    jest.spyOn(actual, 'default').mockReturnValue(playAttempt.endTime + 17 * 60);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            levelId: LEVEL_ID_FOR_TESTING
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.message).toBe('created');
        const playAttempt = await PlayAttemptModel.findById(response.playAttempt);

        expect(playAttempt.updateCount).toBe(0);
        expect(response.playAttempt).toBeDefined();
        const level = await LevelModel.findById(LEVEL_ID_FOR_TESTING);

        expect(level.calc_playattempts_count).toBe(1); // THIS SHOULD STILL BE 1. Because the session create shouldn't count toward the level really
        expect(level.calc_playattempts_duration_sum).toBe(5 * MINUTE);
      },
    });
  });
  test('Doing a fourth POST "20 minutes later" should now give a update', async () => {
    // mock call to getTs()
    const playAttempt = await PlayAttemptModel.findById(playAttemptId);
    const actual = jest.requireActual('../../../../helpers/getTs');

    jest.spyOn(actual, 'default').mockReturnValue(playAttempt.endTime + 20 * 60);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            levelId: LEVEL_ID_FOR_TESTING
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.message).toBe('updated');
        expect(response.playAttempt).toBeDefined();

        // there should be two play attempts in the db now for this level
        const playAttempt = await PlayAttemptModel.findById(response.playAttempt);

        expect(playAttempt.updateCount).toBe(1);
        const playAttempts = await PlayAttemptModel.find({
          levelId: LEVEL_ID_FOR_TESTING,
        });

        expect(playAttempts.length).toBe(2);
        const level = await LevelModel.findById(LEVEL_ID_FOR_TESTING);

        expect(level.calc_playattempts_count).toBe(2);
        expect(level.calc_playattempts_duration_sum).toBe(5 * MINUTE + 3 * MINUTE);

      },
    });
  });
  test('Test the resync should actually work', async () => {
    // now let's destroy the level's calcs
    const level = await LevelModel.findById(LEVEL_ID_FOR_TESTING);

    await LevelModel.findByIdAndUpdate(LEVEL_ID_FOR_TESTING, {
      $set: {
        calc_playattempts_count: 0,
        calc_playattempts_duration_sum: 0,
      },
    });

    await calcPlayAttempts(level); // this should 'resync' the level to the same value
    const levelagain = await LevelModel.findById(LEVEL_ID_FOR_TESTING);

    expect(levelagain.calc_playattempts_count).toBe(2);
    expect(levelagain.calc_playattempts_duration_sum).toBe(5 * MINUTE + 3 * MINUTE);
  });
  test('Now we need to actually beat the level', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            levelId: LEVEL_ID_FOR_TESTING,
            codes: [
              'ArrowRight',
              'ArrowRight',
              'ArrowRight',
              'ArrowRight',
              'ArrowDown',
              'ArrowDown',
              'ArrowDown',
              'ArrowDown',
            ],
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

        expect(response.error).toBeUndefined();
      },
    });
  });
  test('Doing a POST AFTER winning should not work', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            levelId: LEVEL_ID_FOR_TESTING
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(412);
        expect(response.error).toBe('Already beaten');
        // there should be two play attempts in the db now for this level
        const playAttempts = await PlayAttemptModel.find({
          levelId: LEVEL_ID_FOR_TESTING,
        });

        expect(playAttempts.length).toBe(2);
      },
    });
  });

});
