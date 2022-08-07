import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { LevelModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/stats/index';

const USER_ID_FOR_TESTING = '600000000000000000000000';
const LEVEL_ID_FOR_TESTING = '600000000000000000000002';
const differentUser = '600000000000000000000006';

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
  test('Doing a PUT with empty body should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
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
  test('Doing a PUT with empty body should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
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
  test('Doing a PUT with a body but no params should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
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
  test('Doing a PUT with a body but malformed level solution should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            codes: '12345',
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
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            codes: ['ArrowLeft', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown'],
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
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            codes: ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown'],
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

        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(LEVEL_ID_FOR_TESTING);

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

        expect(response.error).toBeUndefined();
        expect(response.length).toBe(1);
        expect(response[0].attempts).toBe(1);
        expect(response[0].complete).toBe(true);
        expect(response[0].userId).toBe(USER_ID_FOR_TESTING);
        expect(response[0].moves).toBe(14);
        expect(res.status).toBe(200);

        const lvl = await LevelModel.findById(LEVEL_ID_FOR_TESTING);

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
            token: getTokenCookieValue(differentUser),
          },
          body: {
            codes: ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown'],
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

        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(LEVEL_ID_FOR_TESTING);

        expect(lvl.leastMoves).toBe(14);
        expect(lvl.calc_stats_players_beaten).toBe(2);
      },
    });
  });
  test('Doing a PUT with a different user with correct minimum level solution should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(differentUser),
          },
          body: {
            codes: [ 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown'],
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

        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(LEVEL_ID_FOR_TESTING);

        expect(lvl.leastMoves).toBe(8);
        expect(lvl.calc_stats_players_beaten).toBe(1);
      },
    });
  });
});
