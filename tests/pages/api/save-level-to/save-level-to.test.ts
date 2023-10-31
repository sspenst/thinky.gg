import { logger } from '@root/helpers/logger';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { CollectionWithLevel } from '../../../../models/db/collection';
import collectionsHandler from '../../../../pages/api/collections';
import saveLevelToHandler from '../../../../pages/api/save-level-to/[id]';

afterAll(async() => {
  await dbDisconnect();
});
beforeAll(async () => {
  await dbConnect();
});
enableFetchMocks();
describe('pages/api/save-level-to/[id].ts', () => {
  test('GET save-level-to', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL,
          },
        } as unknown as NextApiRequestWithAuth;

        await saveLevelToHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(405);
      },
    });
  });
  test('PUT no body', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL,
          },
        } as unknown as NextApiRequestWithAuth;

        await saveLevelToHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(400);
      },
    });
  });
  test('PUT invalid body', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL,
          },
          body: {
            collectionIds: 'adsf',
          },
        } as unknown as NextApiRequestWithAuth;

        await saveLevelToHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(400);
      },
    });
  });
  test('PUT bad collection id', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL,
          },
          body: {
            collectionIds: [TestId.LEVEL],
          },
        } as unknown as NextApiRequestWithAuth;

        await saveLevelToHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Collection id not found');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Check initial collections', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL,
          },
        } as unknown as NextApiRequestWithAuth;

        await collectionsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json() as CollectionWithLevel[];

        expect(response.length).toBe(2);
        expect(response[0].containsLevel).toBe(true);
        expect(response[1].containsLevel).toBe(true);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Remove level from collection 2', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL,
          },
          body: {
            collectionIds: [TestId.COLLECTION],
          },
        } as unknown as NextApiRequestWithAuth;

        await saveLevelToHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response._id.toString()).toBe(TestId.LEVEL);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Verify collection 2 doesn\'t contain the level', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL,
          },
        } as unknown as NextApiRequestWithAuth;

        await collectionsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json() as CollectionWithLevel[];

        expect(response.length).toBe(2);
        expect(response[0].containsLevel).toBe(true);
        expect(response[1].containsLevel).toBe(false);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Remove level from collection 1 and add to collection 2', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL,
          },
          body: {
            collectionIds: [TestId.COLLECTION_2],
          },
        } as unknown as NextApiRequestWithAuth;

        await saveLevelToHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response._id.toString()).toBe(TestId.LEVEL);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Verify collection 1 doesn\'t contain the level, but collection 2 does', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL,
          },
        } as unknown as NextApiRequestWithAuth;

        await collectionsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json() as CollectionWithLevel[];

        expect(response.length).toBe(2);
        expect(response[0].containsLevel).toBe(false);
        expect(response[1].containsLevel).toBe(true);
        expect(res.status).toBe(200);
      },
    });
  });
});
