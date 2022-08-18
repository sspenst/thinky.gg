import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { LevelModel, RecordModel, StatModel, UserModel } from '../../../../models/mongoose';
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

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a PUT with empty body should error', async () => {
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

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a PUT with a body but no params should error', async () => {
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

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a PUT with a body but malformed level solution should error', async () => {
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

        expect(response.error).toBe('Invalid solution provided');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a PUT with a body but incorrect level solution should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            codes: ['ArrowLeft', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown'],
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
      },
    });
  });

  test('Doing a PUT with correct level solution (that is long) should be OK', async () => {
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

        expect(response.error).toBeUndefined();
        expect(response.length).toBe(1);
        expect(response[0].attempts).toBe(1);
        expect(response[0].complete).toBe(true);
        expect(response[0].userId).toBe(TestId.USER);
        expect(response[0].moves).toBe(14);
        expect(res.status).toBe(200);

        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(14);
        expect(lvl.calc_stats_players_beaten).toBe(1);
      },
    });
  });
  test('Doing a PUT with a DIFFERENT user with a level solution (that is long) should be OK', async () => {
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

        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(14);
        expect(lvl.calc_stats_players_beaten).toBe(2);
      },
    });
  });
  test('Test what happens when the DB has an error in the middle of a transaction (it should undo all the queries)', async () => {
    // The findOne that api/stats checks for a stat existing already, let's make this fail by returning a promise that errors
    jest.spyOn(StatModel, 'updateOne').mockReturnValueOnce({
      exec: () => {throw new Error('Test error');}
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

        expect(response.error).toBe('Internal server error');

        expect(res.status).toBe(500);
        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(14);
        expect(lvl.calc_stats_players_beaten).toBe(2);
        // get records
        const records = await RecordModel.find({ levelId: TestId.LEVEL }, {}, { sort: { moves: 1 } });

        expect(records.length).toBe(2); // should still be 2 records
        expect(records[0].moves).toBe(14);
        expect(records[1].moves).toBe(20);

        // get user
        const u = await UserModel.findById(TestId.USER);
        const b = await UserModel.findById(TestId.USER_B);

        expect(u.score).toBe(1);
        expect(b.score).toBe(1);
      },
    });
  });
  test('Doing a PUT with a different user with correct minimum level solution should be OK', async () => {
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

        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(8);
        expect(lvl.calc_stats_players_beaten).toBe(1);
        // get records
        const records = await RecordModel.find({ levelId: TestId.LEVEL }, {}, { sort: { moves: 1 } });

        expect(records.length).toBe(3);
        expect(records[0].moves).toBe(8);
        expect(records[1].moves).toBe(14);
        expect(records[2].moves).toBe(20);
        // get user
        const u = await UserModel.findById(TestId.USER);
        const b = await UserModel.findById(TestId.USER_B);

        expect(u.score).toBe(0); // user a should have lost points
        expect(b.score).toBe(1);
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

        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(TestId.LEVEL);

        expect(lvl.leastMoves).toBe(8);
        expect(lvl.calc_stats_players_beaten).toBe(1);
        // get records
        const records = await RecordModel.find({ levelId: TestId.LEVEL }, {}, { sort: { moves: 1 } });

        expect(records.length).toBe(3);
        expect(records[0].moves).toBe(8);
        expect(records[1].moves).toBe(14);
        expect(records[2].moves).toBe(20);

        // get user
        const u = await UserModel.findById(TestId.USER);
        const b = await UserModel.findById(TestId.USER_B);

        expect(u.score).toBe(0);
        expect(b.score).toBe(1);
      },
    });
  });
});
