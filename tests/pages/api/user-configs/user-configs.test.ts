import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import userConfigsHandler from '../../../../pages/api/user-configs/index';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

describe('/api/user-configs', () => {
  test('GET should return user configs map for authenticated user', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          headers: {
            'content-type': 'application/json',
            'host': DEFAULT_GAME_ID + '.localhost',
          },
          query: {},
        } as unknown as NextApiRequestWithAuth;

        await userConfigsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(typeof response).toBe('object');
        // The response should be a map with gameId as key
        expect(response).toBeDefined();
      }
    });
  });

  test('GET should require authentication', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {},
          headers: {
            'content-type': 'application/json',
            'host': DEFAULT_GAME_ID + '.localhost',
          },
          query: {},
        } as unknown as NextApiRequestWithAuth;

        await userConfigsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(401);
      }
    });
  });
});
