import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import userExistsHandler from '../../../../pages/api/user/exists';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

describe('/api/user/exists', () => {
  test('checking if existing user exists should return true', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {},
          headers: {
            'content-type': 'application/json',
            'host': DEFAULT_GAME_ID + '.localhost',
          },
          query: {
            name: 'test'
          },
        } as unknown as NextApiRequestWithAuth;

        await userExistsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.exists).toBe(true);
      }
    });
  });

  test('checking if non-existing user exists should return false', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {},
          headers: {
            'content-type': 'application/json',
            'host': DEFAULT_GAME_ID + '.localhost',
          },
          query: {
            name: 'nonexistentuser12345'
          },
        } as unknown as NextApiRequestWithAuth;

        await userExistsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.exists).toBe(false);
      }
    });
  });

  test('should handle user name with whitespace', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {},
          headers: {
            'content-type': 'application/json',
            'host': DEFAULT_GAME_ID + '.localhost',
          },
          query: {
            name: ' test '
          },
        } as unknown as NextApiRequestWithAuth;

        await userExistsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.exists).toBe(true);
      }
    });
  });
});
