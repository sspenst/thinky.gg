import TestId from '@root/constants/testId';
import { logger } from '@root/helpers/logger';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import handler from '../../../../pages/api/play-later/index';
import { CollectionModel } from '@root/models/mongoose';
import { CollectionType } from '@root/models/CollectionEnums';
import Collection from '@root/models/db/collection';
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
  test("GET when it doesn't exist", async () => {
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
            token: getTokenCookieValue(TestId.USER),
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
            token: getTokenCookieValue(TestId.USER),
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
  test('GET playlist should return only ids', async () => {
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
        const col = await CollectionModel.findOne({
          userId: TestId.USER,
          type: CollectionType.PlayLater,
        });

        const res = await fetch();
        const response = await res.json();
        expect(res.status).toBe(200);
        expect(response.error).toBe(undefined);
        const responseAsMap = response as Map<string, boolean>;

        expect(responseAsMap).toStrictEqual({
          [TestId.LEVEL]: true,
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
            token: getTokenCookieValue(TestId.USER),
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
  test('GET playlist should after removing should return empty', async () => {
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
        const col = await CollectionModel.findOne({
          userId: TestId.USER,
          type: CollectionType.PlayLater,
        });

        const res = await fetch();
        const response = await res.json();
        expect(res.status).toBe(200);
        expect(response.error).toBe(undefined);
        const responseAsMap = response as Map<string, boolean>;

        expect(responseAsMap).toStrictEqual({});
      },
    });
  });
});
