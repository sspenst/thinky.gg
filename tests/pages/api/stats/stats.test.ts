import Direction from '@root/constants/direction';
import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import Stat from '@root/models/db/stat';
import UserConfig from '@root/models/db/userConfig';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { LevelModel, RecordModel, StatModel, UserConfigModel, UserModel } from '../../../../models/mongoose';
import { processQueueMessages } from '../../../../pages/api/internal-jobs/worker';
import handler from '../../../../pages/api/stats/index';
import unpublishLevelHandler from '../../../../pages/api/unpublish/[id]';

beforeAll(async () => {
  await dbConnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Testing stats api', () => {
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
            directions: '12345',
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

        expect(response.error).toBe('Invalid body.directions');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a PUT on an unknown level should error', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const levelId = new Types.ObjectId();

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            directions: [Direction.RIGHT],
            levelId: levelId,
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

        expect(response.error).toBe(`Error finding level ${levelId.toString()}`);
        expect(res.status).toBe(404);
      },
    });
  });
  test('Doing a PUT with an invalid direction should 400', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const levelId = new Types.ObjectId();

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            directions: [5, Direction.RIGHT],
            levelId: levelId,
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

        expect(response.error).toBe('Invalid direction provided: 5');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a PUT with a body but incorrect level solution should 400', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    const directionTests = [
      [Direction.LEFT], // test left border
      [Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN, Direction.LEFT, Direction.LEFT], // tries to go over hole
      [Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN, Direction.DOWN, Direction.DOWN], // tries to push directional movable where it cant be pushed
      [Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT], // tries to push directional movable where it cant be pushed because of edge
      [Direction.DOWN], // run into wall
      [Direction.RIGHT, Direction.DOWN, Direction.RIGHT, Direction.RIGHT], // tries to push directional movable where it cant be pushed because something in way
      [Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.LEFT], // push movable into wall
    ];

    for (const directionTest of directionTests) {
      await testApiHandler({
        handler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'PUT',
            cookies: {
              token: getTokenCookieValue(TestId.USER),
            },
            body: {
              directions: directionTest,
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
          expect(response.error).toBe(`Invalid solution provided for level ${TestId.LEVEL}`);
          expect(res.status).toBe(400);
          const u = await UserConfigModel.findOne({ userId: TestId.USER });

          expect(u.calcRecordsCount).toEqual(2); // initializes with 1
        },
      });
    }
  });

  test('Doing a PUT from USER with correct level solution (that is long, 14 steps) on a draft level should be OK', async () => {
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
            directions: [Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.RIGHT, Direction.UP, Direction.LEFT, Direction.LEFT, Direction.DOWN, Direction.DOWN, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN],
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
        const [lvl, u] = await Promise.all([LevelModel.findById(TestId.LEVEL), UserConfigModel.findOne<UserConfig>({ userId: TestId.USER })]);

        expect(lvl.leastMoves).toBe(14);

        expect(u?.calcRecordsCount).toEqual(2);
      },
    });
  });
  test('Doing ANOTHER PUT from USER with correct level solution (that is long, 14 steps) on a draft level should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },

          body: {
            directions: [Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.RIGHT, Direction.UP, Direction.LEFT, Direction.LEFT, Direction.DOWN, Direction.DOWN, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN],
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
        const [lvl, u] = await Promise.all([LevelModel.findById(TestId.LEVEL), UserConfigModel.findOne({ userId: TestId.USER })]);

        expect(lvl.leastMoves).toBe(14);

        expect(u.calcRecordsCount).toEqual(2);
      },
    });
  });
  test('Doing ANOTHER PUT with USERB with correct level solution (that is long, 14 steps) with a DIFFERENT user on a draft level should FAIL', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          body: {
            directions: [Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.RIGHT, Direction.UP, Direction.LEFT, Direction.LEFT, Direction.DOWN, Direction.DOWN, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN],
            levelId: TestId.LEVEL,
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

        expect(response.error).toBe(`Unauthorized access for level ${TestId.LEVEL}`);
        expect(res.status).toBe(401);
        const u = await UserConfigModel.findOne<UserConfig>({ userId: TestId.USER });

        expect(u?.calcRecordsCount).toEqual(2);
      },
    });
  });
  test('Doing a PUT from USER with a correct level solution (that is 12 steps) on a published level should be OK', async () => {
    const u = await UserConfigModel.findOne({ userId: TestId.USER });

    expect(u.calcRecordsCount).toEqual(2);
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
            directions: [Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.LEFT, Direction.UP, Direction.DOWN, Direction.DOWN],
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
        const [lvl, u] = await Promise.all([LevelModel.findById(TestId.LEVEL), UserConfigModel.findOne({ userId: TestId.USER })]);

        expect(lvl.leastMoves).toBe(12);

        expect(u.calcRecordsCount).toEqual(2); // +0 since this is the same owner of the level
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
        expect(response.some((s: Stat) => s.attempts === 2 && s.moves === 12)).toBeTruthy();
        expect(response.some((s: Stat) => s.attempts === 1 && s.moves === 80)).toBeTruthy();
        expect(res.status).toBe(200);

        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(12);
        expect(lvl.calc_stats_players_beaten).toBe(1);
      },
    });
  });
  test('Doing a PUT with a USERB user with a level solution (that is 14 steps) should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          body: {
            directions: [Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.RIGHT, Direction.UP, Direction.LEFT, Direction.LEFT, Direction.DOWN, Direction.DOWN, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN],
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
        expect(lvl.calc_stats_players_beaten).toBe(1); // still hasn't solved since 14 steps > minimum

        const b = await UserConfigModel.findOne({ userId: TestId.USER_B });

        expect(b.calcRecordsCount).toEqual(0);
      },
    });
  });
  test('For the second time, doing a PUT with a USERB user with a level solution (that is 14 steps) should be OK and increment their attempts', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          body: {
            directions: [Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.RIGHT, Direction.UP, Direction.LEFT, Direction.LEFT, Direction.DOWN, Direction.DOWN, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN],
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
        expect(lvl.calc_stats_players_beaten).toBe(1); // still hasn't solved since 14 steps > minimum

        const stat = await StatModel.findOne({ userId: TestId.USER_B, levelId: TestId.LEVEL });

        expect(stat.attempts).toBe(3);
        expect(stat.gameId).toBe(DEFAULT_GAME_ID);

        const b = await UserConfigModel.findOne({ userId: TestId.USER_B });

        expect(b.calcRecordsCount).toEqual(0);
      },
    });
  });
  test('Doing a PUT with a USER_B user with a level solution (that is 12 steps) should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          body: {
            directions: [Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.LEFT, Direction.UP, Direction.DOWN, Direction.DOWN],
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

        const [lvl, b] = await Promise.all([LevelModel.findById(TestId.LEVEL), UserConfigModel.findOne({ userId: TestId.USER_B })]);

        expect(lvl.leastMoves).toBe(12);
        expect(lvl.calc_stats_players_beaten).toBe(2);

        expect(b.calcRecordsCount).toEqual(0);
      },
    });
  });
  test('Test what happens when the DB has an error in the middle of a transaction from USERB (it should undo all the queries)', async () => {
    // The findOne that api/stats checks for a stat existing already, let's make this fail by returning a promise that errors

    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(StatModel, 'updateOne').mockRejectedValueOnce(new Error('Test DB error'));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          body: {
            directions: [ Direction.RIGHT, Direction.DOWN, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN, Direction.DOWN],
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
        const [lvl, records] = await Promise.all([LevelModel.findById(TestId.LEVEL), RecordModel.find({ levelId: TestId.LEVEL }, {}, { sort: { moves: 1 } })]);

        expect(lvl.leastMoves).toBe(12);
        expect(lvl.calc_stats_players_beaten).toBe(2);
        // get records

        expect(records.length).toBe(2); // should still be 2 records
        expect(records[0].moves).toBe(12);
        expect(records[1].moves).toBe(20);

        // get user
        const [u, b] = await Promise.all([UserConfigModel.findOne({ userId: TestId.USER }), UserConfigModel.findOne({ userId: TestId.USER_B })]);

        expect(u.calcLevelsSolvedCount).toBe(2);
        expect(b.calcLevelsSolvedCount).toBe(1);

        expect(b.calcRecordsCount).toEqual(0);
      },
    });
  });
  test('Doing a PUT with USER_C user with correct minimum level solution should be OK', async () => {
    const c = await UserConfigModel.findOne({ userId: TestId.USER_C });

    expect(c.calcLevelsSolvedCount).toBe(1);
    expect(c.calcRecordsCount).toBe(1);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_C),
          },
          body: {
            directions: [ Direction.RIGHT, Direction.DOWN, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN, Direction.DOWN],
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
        expect(records[0].userId.toString()).toBe(TestId.USER_C);
        expect(records[1].moves).toBe(12);
        expect(records[2].moves).toBe(20);
        expect(records.length).toBe(3);

        // get stat model for level
        const stat = await StatModel.findOne({ userId: TestId.USER_C, levelId: TestId.LEVEL });

        expect(stat.moves).toBe(8);

        // get user
        const [u, b, c] = await Promise.all([
          UserConfigModel.findOne({ userId: TestId.USER }),
          UserConfigModel.findOne({ userId: TestId.USER_B }),
          UserConfigModel.findOne({ userId: TestId.USER_C })
        ]);

        expect(u.calcLevelsSolvedCount).toBe(1); // user a should have lost points
        expect(u.calcRecordsCount).toBe(2);
        expect(b.calcLevelsSolvedCount).toBe(0);
        expect(b.calcRecordsCount).toBe(0);
        expect(c.calcLevelsSolvedCount).toBe(2); // note that User C initializes with a score of 1
        expect(c.calcRecordsCount).toBe(2); // +1!
      },
    });
  });
  test('REPEATING doing a PUT with TESTB user with correct minimum level solution should be OK and idempotent', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          body: {
            directions: [ Direction.RIGHT, Direction.DOWN, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN, Direction.DOWN],
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
        const [u, b, c] = await Promise.all([
          UserConfigModel.findOne({ userId: TestId.USER }),
          UserConfigModel.findOne({ userId: TestId.USER_B }),
          UserConfigModel.findOne({ userId: TestId.USER_C })

        ]);

        expect(u.calcLevelsSolvedCount).toBe(1); // user a should have lost points
        expect(u.calcRecordsCount).toBe(2);
        expect(b.calcLevelsSolvedCount).toBe(1); // +1
        expect(b.calcRecordsCount).toBe(0);
        expect(c.calcLevelsSolvedCount).toBe(2); // note that User C initializes with a score of 1
        expect(c.calcRecordsCount).toBe(2);
      },
    });
  });
  test('Unpublishing a level and make sure calc records get updated', async () => {
    const user = await UserConfigModel.findOne({ userId: TestId.USER_C });

    expect(user.calcRecordsCount).toBe(2);
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL,
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
        const c = await UserConfigModel.findOne({ userId: TestId.USER_C });

        expect(c.calcRecordsCount).toBe(1);
      },
    });
  });
});
