import { ObjectID } from 'bson';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { LevelModel, RecordModel, StatModel, UserModel } from '../../../../models/mongoose';
import { processQueueMessages } from '../../../../pages/api/internal-jobs/worker';
import handler from '../../../../pages/api/stats/index';

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Testing stats api', () => {
  test('Wrong HTTP method should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PATCH',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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
  test('Doing a PUT with empty body should error', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(response.error).toBe('Bad request');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a PUT with empty body should error', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(response.error).toBe('Bad request');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a PUT with a body but no params should error', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(response.error).toBe('Invalid body.codes, body.levelId');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a PUT with a body but malformed level solution should error', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            codes: '12345',
            levelId: TestId.LEVEL
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

        expect(response.error).toBe('Invalid body.codes');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a PUT on an unknown level should error', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            codes: ['ArrowRight'],
            levelId: new ObjectID()
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

        expect(response.error).toBe('Error finding Level');
        expect(res.status).toBe(404);
      },
    });
  });
  test('Doing a PUT with a body but incorrect level solution should be OK', async () => {
    const codeTests = [
      ['ArrowLeft'], // test left border
      ['WRONG', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight'], // test invalid
      ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowLeft'], // tries to go over hole
      ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown'], // tries to push directional movable where it cant be pushed
      ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight'], // tries to push directional movable where it cant be pushed because of edge
      ['ArrowDown'], // run into wall
      ['ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowRight'], // tries to push directional movable where it cant be pushed because something in way
      ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft'], // push movable into wall
    ];

    for (const codeTest of codeTests) {
      await testApiHandler({
        handler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'PUT',
            cookies: {
              token: getTokenCookieValue(TestId.USER),
            },
            body: {
              codes: codeTest,
              levelId: TestId.LEVEL
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
          const lvl = await LevelModel.findById(TestId.LEVEL);

          expect(lvl.leastMoves).toBe(20);
          expect(response.error).toBe('Invalid solution provided');
          expect(res.status).toBe(400);
          const u = await UserModel.findById(TestId.USER);

          expect(u.calc_records).toEqual(2); // initializes with 1
        },
      });
    }
  });

  test('Doing a PUT with correct level solution (that is long, 14 steps) on a draft level should be OK', async () => {
    await LevelModel.findByIdAndUpdate(TestId.LEVEL, {
      $set: {
        isDraft: true,
      }
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },

          body: {
            codes: ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown'],
            levelId: TestId.LEVEL
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

        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(14);
        const u = await UserModel.findById(TestId.USER);

        expect(u.calc_records).toEqual(2);
      },
    });
  });
  test('Doing ANOTHER PUT with correct level solution (that is long, 14 steps) on a draft level should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },

          body: {
            codes: ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown'],
            levelId: TestId.LEVEL
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

        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(14);
        const u = await UserModel.findById(TestId.USER);

        expect(u.calc_records).toEqual(2);
      },
    });
  });
  test('Doing ANOTHER PUT with correct level solution (that is long, 14 steps) with a DIFFERENT user on a draft level should FAIL', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },

          body: {
            codes: ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown'],
            levelId: TestId.LEVEL
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

        expect(response.error).toBe('Error finding Level');
        expect(res.status).toBe(404);
        const u = await UserModel.findById(TestId.USER);

        expect(u.calc_records).toEqual(2);
      },
    });
  });
  test('Doing a PUT with correct level solution (that is 12 steps) on a published level should be OK', async () => {
    await LevelModel.findByIdAndUpdate(TestId.LEVEL, {
      $set: {
        isDraft: false,
      }
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },

          body: {
            codes: ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowDown'],
            levelId: TestId.LEVEL
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

        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(12);
        const u = await UserModel.findById(TestId.USER);

        expect(u.calc_records).toEqual(2);
      },
    });
  });
  test('Doing a GET should return a stats object', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        await processQueueMessages();
        expect(response.error).toBeUndefined();
        expect(response.length).toBe(2);
        expect(response[0].attempts).toBe(2);
        expect(response[0].complete).toBe(true);
        expect(response[0].userId).toBe(TestId.USER);
        expect(response[0].moves).toBe(12);
        expect(res.status).toBe(200);

        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(12);
        expect(lvl.calc_stats_players_beaten).toBe(1);
      },
    });
  });
  test('Doing a PUT with a DIFFERENT user with a level solution (that is 14 steps) should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          body: {
            codes: ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown'],
            levelId: TestId.LEVEL
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

        await processQueueMessages();
        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(12);
        expect(lvl.calc_stats_players_beaten).toBe(1); // still hasn't won since 14 steps > minimum
      },
    });
  });
  test('For the second time, doing a PUT with a DIFFERENT user with a level solution (that is 14 steps) should be OK and increment their attempts', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          body: {
            codes: ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown'],
            levelId: TestId.LEVEL
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

        await processQueueMessages();
        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(12);
        expect(lvl.calc_stats_players_beaten).toBe(1); // still hasn't won since 14 steps > minimum

        const stat = await StatModel.findOne({ userId: TestId.USER_B, levelId: TestId.LEVEL });

        expect(stat.attempts).toBe(2);
      },
    });
  });
  test('Doing a PUT with a DIFFERENT user with a level solution (that is 12 steps) should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          body: {
            codes: ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowDown'],
            levelId: TestId.LEVEL
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

        await processQueueMessages();
        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(12);
        expect(lvl.calc_stats_players_beaten).toBe(2);
      },
    });
  });
  test('Test what happens when the DB has an error in the middle of a transaction (it should undo all the queries)', async () => {
    // The findOne that api/stats checks for a stat existing already, let's make this fail by returning a promise that errors
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    jest.spyOn(StatModel, 'updateOne').mockReturnValueOnce({
      exec: () => {throw new Error('Test DB error');}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          body: {
            codes: [ 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown'],
            levelId: TestId.LEVEL
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

        await processQueueMessages();
        expect(response.error).toBe('Internal server error');

        expect(res.status).toBe(500);
        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(12);
        expect(lvl.calc_stats_players_beaten).toBe(2);
        // get records
        const records = await RecordModel.find({ levelId: TestId.LEVEL }, {}, { sort: { moves: 1 } });

        expect(records.length).toBe(2); // should still be 2 records
        expect(records[0].moves).toBe(12);
        expect(records[1].moves).toBe(20);

        // get user
        const u = await UserModel.findById(TestId.USER);
        const b = await UserModel.findById(TestId.USER_B);

        expect(u.score).toBe(2);
        expect(b.score).toBe(1);
      },
    });
  });
  test('Doing a PUT with a THIRD user with correct minimum level solution should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_C),
          },
          body: {
            codes: [ 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown'],
            levelId: TestId.LEVEL
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

        await processQueueMessages();
        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(8);
        expect(lvl.calc_stats_players_beaten).toBe(1);
        // get records
        const records = await RecordModel.find({ levelId: TestId.LEVEL }, {}, { sort: { moves: 1 } });

        expect(records[0].moves).toBe(8);
        expect(records[1].moves).toBe(12);
        expect(records[2].moves).toBe(20);
        expect(records.length).toBe(3);
        // get user
        const u = await UserModel.findById(TestId.USER);
        const b = await UserModel.findById(TestId.USER_B);
        const c = await UserModel.findById(TestId.USER_C);

        expect(u.score).toBe(1); // user a should have lost points
        expect(u.calc_records).toBe(2);
        expect(b.score).toBe(0);
        expect(b.calc_records).toBe(0);
        expect(c.score).toBe(2); // note that User C initializes with a score of 1
        expect(c.calc_records).toBe(2);
      },
    });
  });
  test('REPEATING doing a PUT with a different user with correct minimum level solution should be OK and idempotent', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          body: {
            codes: [ 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown'],
            levelId: TestId.LEVEL
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

        await processQueueMessages();
        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(8);
        expect(lvl.calc_stats_players_beaten).toBe(2);
        // get records
        const records = await RecordModel.find({ levelId: TestId.LEVEL }, {}, { sort: { moves: 1 } });

        expect(records.length).toBe(3);
        expect(records[0].moves).toBe(8);
        expect(records[1].moves).toBe(12);
        expect(records[2].moves).toBe(20);

        // get user
        const u = await UserModel.findById(TestId.USER);
        const b = await UserModel.findById(TestId.USER_B);
        const c = await UserModel.findById(TestId.USER_C);

        expect(u.score).toBe(1);
        expect(b.score).toBe(1);
        expect(c.score).toBe(2);
      },
    });
  });
});
