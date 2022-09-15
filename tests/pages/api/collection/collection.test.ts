import { ObjectId } from 'bson';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { CollectionModel } from '../../../../models/mongoose';
import createCollectionHandler from '../../../../pages/api/collection/index';
import getCollectionHandler from '../../../../pages/api/collection-by-id/[id]';

afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
let collection_id: string;

describe('pages/api/collection/index.ts', () => {
  test('Sending nothing should return 401', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          cookies: {
            token: '',
          },
        } as unknown as NextApiRequestWithAuth;

        await createCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(401);
      },
    });
  });
  test('querying with a non-GET HTTP method should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: collection_id,
          },
        } as unknown as NextApiRequestWithAuth;

        await getCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Doing a POST with no data should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        } as unknown as NextApiRequestWithAuth;

        await createCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid body.name');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a non-POST HTTP method on the create collection should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            authorNote: 'I\'m a nice little collection note.',
            name: 'A Test Collection',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await createCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Doing a POST but only name field should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            name: 'A Test Collection',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await createCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.slug).toBe('test/a-test-collection');
        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
  });
  test('Doing a POST but invalid/missing fields should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            authorNote: 3,
            //name: 'A Test Collection',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await createCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid body.authorNote, body.name');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a POST with correct collection data should be OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            authorNote: 'I\'m a nice little collection note.',
            name: 'A Test Collection',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await createCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.success).toBeUndefined();
        expect(response.slug).toBe('test/a-test-collection-2');
        collection_id = response._id;
        expect(res.status).toBe(200);

        const first = await CollectionModel.findOne({ slug: 'test/a-test-collection' });

        expect(first).toBeDefined();
        expect(first._id).not.toBe(collection_id);
      },
    });
  });
  test('now we should be able to get the collection', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: collection_id,
          },
        } as unknown as NextApiRequestWithAuth;

        await getCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.authorNote).toBe('I\'m a nice little collection note.');
        expect(response.name).toBe('A Test Collection');
        expect(response._id).toBe(collection_id);
        expect(res.status).toBe(200);
      },
    });
  });
  test('now querying for a different collection should NOT return this collection', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: new ObjectId(), // shouldn't exist
          },
        } as unknown as NextApiRequestWithAuth;

        await getCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(404);
      },
    });
  });
});
