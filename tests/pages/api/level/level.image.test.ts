import { NextApiRequest } from 'next';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ObjectId } from 'bson';
import createLevelHandler from '../../../../pages/api/level/index';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { enableFetchMocks } from 'jest-fetch-mock';
import getLevelImageHandler from '../../../../pages/api/level/image/[id]';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { testApiHandler } from 'next-test-api-route-handler';

const USER_ID_FOR_TESTING = '600000000000000000000000';
const WORLD_ID_FOR_TESTING = '600000000000000000000001';
const LEVEL_ID_FOR_TESTING = '600000000000000000000002';

afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('pages/api/level/image/[id]', () => {
  test('Now we should be able to get the level image', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          method: 'GET',
          query: {
            id: LEVEL_ID_FOR_TESTING,
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
            id: new ObjectId(),
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
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
          },
          body: {
            authorNote: 'I\'m a nice little note.',
            name: 'A Test Level',
            points: 0,
            worldIds: [WORLD_ID_FOR_TESTING],
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
});
