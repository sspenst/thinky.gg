import { ObjectId } from 'bson';
import { enableFetchMocks } from 'jest-fetch-mock';
import { NextApiRequest } from 'next';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import getLevelImageHandler from '../../../../pages/api/level/image/[id]';
import createLevelHandler from '../../../../pages/api/level/index';

afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();
afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/api/level/image/[id]', () => {
  test('Now we should be able to get the level image', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          method: 'GET',
          query: {
            id: TestId.LEVEL,
          },
        } as unknown as NextApiRequest;

        await getLevelImageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
        const body = await res.body.read();

        // expect header to be image
        expect(res.headers.get('content-type')).toBe('image/png');
        expect(body.length).toBeGreaterThan(1000);
      },
    });
  }, 30000);
  test('Requesting an image for a level that doesn\'t exist should 404', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          method: 'GET',
          query: {
            id: new ObjectId().toString(),
          },
        } as unknown as NextApiRequest;

        await getLevelImageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(404);
        const response = await res.json();

        // expect header to be json
        expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
        expect(response.error).toBe('Level not found');
      },
    });
  }, 30000);
  test('Requesting an image for a draft level should 401', async () => {
    let draftLevelId: string;

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            authorNote: 'I\'m a nice little note.',
            name: 'A Test Level',
            points: 0,
            collectionIds: [TestId.COLLECTION],
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await createLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.success).toBe(true);
        draftLevelId = response._id;
        expect(res.status).toBe(200);
      },
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          method: 'GET',
          query: {
            id: draftLevelId,
          },
        } as unknown as NextApiRequest;

        await getLevelImageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(401);
        const response = await res.json();

        expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
        expect(response.error).toBe('Level is not published');
      },
    });
  }, 30000);
  test('Requesting an image for an invalid id format should 400', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as any));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          method: 'GET',
          query: {
            id: '[catalog]',
          },
        } as unknown as NextApiRequest;

        await getLevelImageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(400);
        const response = await res.json();

        // expect header to be json
        expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
        expect(response.error).toBe('Invalid query.id');
      },
    });
  }, 30000);
});
