import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { NextApiRequest } from 'next';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import Dimensions from '../../../../constants/dimensions';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import getLevelImageHandler from '../../../../pages/api/level/image/[id]';
import createLevelHandler from '../../../../pages/api/level/index';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();
afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/api/level/image/[id]', () => {
  test('Now we should be able to get the level image', async () => {
    /*
    Dimensions.LevelCanvasWidth and Dimensions.LevelCanvasHeight  mocked to return 1
    This speeds up the test by about 6 seconds
    */
    Object.defineProperty(Dimensions, 'LevelCanvasWidth', { value: 1 });
    Object.defineProperty(Dimensions, 'LevelCanvasHeight', { value: 1 });

    expect(Dimensions.LevelCanvasWidth).toBe(1);
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
        expect(body.length).toBe(82); // small due to mocked dimensions
      },
    });
  }, 30000);
  test('GET a second time to get the cached image', async () => {
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
        expect(body.length).toBe(82);
      },
    });
  }, 30000);
  test('Requesting an image for a level that doesn\'t exist should 404', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequest = {
          method: 'GET',
          query: {
            id: new Types.ObjectId().toString(),
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
            data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000003',
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
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

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
