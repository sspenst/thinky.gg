import TestId from '@root/constants/testId';
import { logger } from '@root/helpers/logger';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { initLevel } from '@root/lib/initializeLocalDb';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { CollectionType } from '@root/models/CollectionEnums';
import { CollectionModel } from '@root/models/mongoose';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import handler from '../../../../pages/api/play-later/index';

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

describe('api/play-later', () => {
  test('GET with non pro user', async () => {
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

        expect(res.status).toBe(401);
        expect(response.error).toBe('You must be a Pro user to use this feature.');
      },
    });
  });
  test('GET when it doesn\'t exist', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO),
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
        expect(response.error).toBe(undefined);

        expect(response).toStrictEqual([]);
      },
    });
  });
  test('POST a level', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO),
          },
          headers: {
            'content-type': 'application/json',
          },
          body: {
            id: TestId.LEVEL,
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.error).toBe(undefined);

        expect(response.success).toBe(true);
      },
    });
  });
  test('POST a level that is already in the list', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO),
          },
          headers: {
            'content-type': 'application/json',
          },
          body: {
            id: TestId.LEVEL,
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(400);
        expect(response.error).toBe(
          'This level is already in your Play Later.'
        );
      },
    });
  });
  test('POST an invalid level', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO),
          },
          headers: {
            'content-type': 'application/json',
          },
          body: {
            id: new Types.ObjectId().toString(),
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(404);
        expect(response.error).toBe(
          'Level not found.'
        );
      },
    });
  });
  let newLevelId: string;

  test('POST another level should be OK', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const newLevel = await initLevel(TestId.USER, 'name0');

    newLevelId = newLevel._id.toString();
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO),
          },
          headers: {
            'content-type': 'application/json',
          },
          body: {
            id: newLevel._id.toString(),
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.success).toBe(true);
      },
    });
  });
  test('POST another level to trigger the MAX_LEVELS_IN_PLAYLIST hit', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    const newLevel = await initLevel(TestId.USER, 'name');

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO),
          },
          headers: {
            'content-type': 'application/json',
          },
          body: {
            id: newLevel._id.toString(),
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(400);
        expect(response.error).toBe(
          'You can only have 2 levels in your Play Later. Please remove some levels and try again.'
        );
      },
    });
  });
  test('GET playlist should return only ids', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO),
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
        expect(response.error).toBe(undefined);
        const responseAsMap = response as Map<string, boolean>;

        expect(responseAsMap).toStrictEqual({
          [TestId.LEVEL]: true,
          [newLevelId]: true,
        });
      },
    });
  });
  test('DELETE a level', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO),
          },
          headers: {
            'content-type': 'application/json',
          },
          body: {
            id: TestId.LEVEL,
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.error).toBe(undefined);

        expect(response.success).toBe(true);
      },
    });
  });
  test('GET playlist should after removing should show correct', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO),
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
        expect(response.error).toBe(undefined);
        const responseAsMap = response as Map<string, boolean>;

        expect(responseAsMap).toStrictEqual({
          [newLevelId]: true,
        });
      },
    });
  });
});
