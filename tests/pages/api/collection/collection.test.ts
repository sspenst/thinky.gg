import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { initCollection } from '../../../../lib/initializeLocalDb';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { CollectionModel } from '../../../../models/mongoose';
import createCollectionHandler from '../../../../pages/api/collection/index';
import getCollectionHandler from '../../../../pages/api/collection-by-id/[id]';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
let collection_id: string;

enableFetchMocks();
describe('pages/api/collection/index.ts', () => {
  test('Sending nothing should return 401', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
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
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
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
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        } as unknown as NextApiRequestWithAuth;

        await createCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Bad request');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a non-POST HTTP method on the create collection should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
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
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            name: 'A Test Collection Blah',
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

        expect(response.isPrivate).toBeFalsy();
        expect(response.slug).toBe('test/a-test-collection-blah');
        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
  });

  test('Doing a POST but naming to a reserved slug should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            name: 'Play  &$$#$ Later',
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

        expect(response.error).toBe('This uses a reserved word (play later). Please use another name for this collection.');
        expect(res.status).toBe(400);
      },
    });
  });

  test('Doing a POST to update level name but invalid characters in name should strip in slug', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            name: '/blah/collections@',
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

        expect(response.slug).toBe('test/blahcollections');
        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
  });

  test('Doing a POST but invalid/missing fields should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
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
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO),
          },
          body: {
            authorNote: 'private collection author note',
            isPrivate: true,
            name: 'Private',
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
        expect(response.slug).toBe('pro/private');
        collection_id = response._id;
        expect(res.status).toBe(200);

        const first = await CollectionModel.findOne({ slug: 'pro/private' });

        expect(first).toBeDefined();
        expect(first._id).not.toBe(collection_id);
      },
    });
  });
  test('now we should NOT be able to get the collection as a public user because it is private', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            id: collection_id,
          },
        } as unknown as NextApiRequestWithAuth;

        await getCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(404);
        expect(response.error).toBe('Error finding Collection');
      },
    });
  });
  test('if we are querying as the user who doesnt own it we should NOT be able to get the collection', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
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

        expect(response.error).toBe('Error finding Collection');
        expect(res.status).toBe(404);
      },
    });
  });
  test('if we are querying as the user who owns it we should be able to get the collection', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO),
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

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response._id).toBe(collection_id);
      },
    });
  });
  test('if we are querying as the user who owns it we should be able to get the collection', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            id: collection_id,
          },
          cookies: {
            token: getTokenCookieValue(TestId.USER_PRO),
          },
        } as unknown as NextApiRequestWithAuth;

        await getCollectionHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.authorNote).toBe('private collection author note');
        expect(response.name).toBe('Private');
        expect(response._id).toBe(collection_id);
        expect(res.status).toBe(200);
      },
    });
  });

  test('now querying for a different collection should NOT return this collection', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: new Types.ObjectId(), // shouldn't exist
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
  test('Create 20 collections with same name in DB, we should never crash because it is so unlikely', async () => {
    const slugs = new Set<string>();

    for (let i = 1; i <= 20; i++) {
      // expect no exceptions
      const collection = await initCollection(TestId.USER, 'Sample');

      expect(slugs.has(collection.slug)).toBe(false);
      slugs.add(collection.slug);
    }
  });
});
