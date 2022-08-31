import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import Theme from '../../../../constants/theme';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import UserConfig from '../../../../models/db/userConfig';
import { UserConfigModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/user-config/index';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
enableFetchMocks();
const defaultObj = {
  method: 'GET',
  headers: {
    'content-type': 'application/json',
  },
  cookies: {
    token: getTokenCookieValue(TestId.USER_C)
  }
};

describe('pages/api/user-config', () => {
  test('Unauthenticated should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          headers: {
            'content-type': 'application/json',
          },
          method: 'GET',

        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Unauthorized: No token provided');
        expect(res.status).toBe(401);
      },
    });
  });
  test('Wrong method should return status code 405', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          method: 'PATCH',
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
  test('Valid GET request', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
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
        const config = response as UserConfig;

        expect(config.sidebar).toBe(true);
        expect(config.theme).toBe(Theme.Modern);
        expect(config.tutorialCompletedAt).toBe(0);
        expect(config.userId).toBe(TestId.USER_C);
      },
    });
  });
  test('PUT but no body', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          method: 'PUT',
          query: {

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
  test('PUT with a blank body ', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          method: 'PUT',
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

        expect(res.status).toBe(400);
        expect(response.error).toBe('Missing required parameters');
      },
    });
  });
  test('PUT but throw error', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => {return;});
    jest.spyOn(UserConfigModel, 'updateOne').mockImplementation(() => {
      throw new Error('Error finding User');
    });
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          method: 'PUT',
          body: {
            theme: Theme.Dark,
          }
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(500);
        expect(response.error).toBe('Error updating config');
      },
    });
  });
  test('PUT with valid changes ', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
          method: 'PUT',
          body: {
            sidebar: false,
            theme: Theme.Light,
            tutorialCompletedAt: Date.now(),
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
        expect(response.updated).toBe(true);
      },
    });
  });
  test('Valid GET request after changing', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...defaultObj,
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
        const config = response as UserConfig;

        expect(config.sidebar).toBe(false);
        expect(config.theme).toBe(Theme.Light);
        expect(config.tutorialCompletedAt).toBeGreaterThan(Date.now() - 1000);
        expect(config.userId).toBe(TestId.USER_C);
      },
    });
  });
});
