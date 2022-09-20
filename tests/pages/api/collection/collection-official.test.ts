import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import Collection from '../../../../models/db/collection';
import { CollectionModel } from '../../../../models/mongoose';
import collectionHandler from '../../../../pages/api/collection/[id]';
import collectionsHandler from '../../../../pages/api/collections';

afterAll(async() => {
  await dbDisconnect();
});

describe('pages/api/collection/*.ts', () => {
  test('GET official collection should 404', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.COLLECTION_OFFICIAL,
          },
        } as unknown as NextApiRequestWithAuth;

        await collectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(404);
      },
    });
  });
  test('GET official collection as curator should 200', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER_C,
          cookies: {
            token: getTokenCookieValue(TestId.USER_C),
          },
          query: {
            id: TestId.COLLECTION_OFFICIAL,
          },
        } as unknown as NextApiRequestWithAuth;

        await collectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
      },
    });
  });
  test('PUT official collection should 401', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.COLLECTION_OFFICIAL,
          },
          body: {
            name: 'you\'ve been hacked',
          },
        } as unknown as NextApiRequestWithAuth;

        await collectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(401);
      },
    });
  });
  test('PUT official collection as curator should 200', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER_C,
          cookies: {
            token: getTokenCookieValue(TestId.USER_C),
          },
          query: {
            id: TestId.COLLECTION_OFFICIAL,
          },
          body: {
            name: 'Changed Official name',
            levels: [TestId.LEVEL, TestId.LEVEL_2],
          },
        } as unknown as NextApiRequestWithAuth;

        await collectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.levels.length).toBe(2);
        expect(res.status).toBe(200);

        const collection = await CollectionModel.findById(TestId.COLLECTION_OFFICIAL);

        expect(collection.name).toBe('Changed Official name');
        expect(collection.slug).toBe('pathology/changed-official-name');
      },
    });
  });
  test('DELETE official collection as curator should 401', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          userId: TestId.USER_C,
          cookies: {
            token: getTokenCookieValue(TestId.USER_C),
          },
          query: {
            id: TestId.COLLECTION_OFFICIAL,
          },
        } as unknown as NextApiRequestWithAuth;

        await collectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(401);
      },
    });
  });
  test('GET collections should not contain official collection', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        } as unknown as NextApiRequestWithAuth;

        await collectionsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json() as Collection[];
        const officialCollections = response.filter(collection => !collection.userId);

        expect(officialCollections.length).toBe(0);
        expect(res.status).toBe(200);
      },
    });
  });
  test('GET collections as curator should contain official collection', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER_C,
          cookies: {
            token: getTokenCookieValue(TestId.USER_C),
          },
        } as unknown as NextApiRequestWithAuth;

        await collectionsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json() as Collection[];
        const officialCollections = response.filter(collection => !collection.userId);

        expect(officialCollections.length).toBe(1);
        expect(res.status).toBe(200);
      },
    });
  });
});
