import Dimensions from '@root/constants/dimensions';
import { DEFAULT_GAME_ID, GameId } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import { NextApiRequestWrapper } from '@root/helpers/apiWrapper';
import { TimerUtil } from '@root/helpers/getTs';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { LevelModel } from '@root/models/mongoose';
import { processQueueMessages } from '@root/pages/api/internal-jobs/worker';
import getLevelImageHandler from '@root/pages/api/level/image/[id]';
import publishLevelHandler from '@root/pages/api/publish/[id]';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
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
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: GameId.PATHOLOGY,
          method: 'GET',
          query: {
            id: TestId.LEVEL,
          },
        } as unknown as NextApiRequestWrapper;

        await getLevelImageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await (res as any).body.read();

        // expect header to be image
        expect(res.headers.get('content-type')).toBe('image/png');
        expect(body.length).toBe(82); // small due to mocked dimensions
      },
    });
  }, 30000);
  test('GET a second time to get the cached image', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: GameId.PATHOLOGY,
          method: 'GET',
          query: {
            id: TestId.LEVEL,
          },
        } as unknown as NextApiRequestWrapper;

        await getLevelImageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await (res as any).body.read();

        // expect header to be image
        expect(res.headers.get('content-type')).toBe('image/png');
        expect(body.length).toBe(82);
      },
    });
  }, 30000);
  test('Requesting an image for a level that doesn\'t exist should 404', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: GameId.PATHOLOGY,
          method: 'GET',
          query: {
            id: new Types.ObjectId().toString(),
          },
        } as unknown as NextApiRequestWrapper;

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
      pagesHandler: async (_, res) => {
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
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: GameId.PATHOLOGY,
          method: 'GET',
          query: {
            id: draftLevelId,
          },
        } as unknown as NextApiRequestWrapper;

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
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: GameId.PATHOLOGY,
          method: 'GET',
          query: {
            id: '[home]',
          },
        } as unknown as NextApiRequestWrapper;

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
  test('Publish a level then getting the level image should error saying no image', async () => {
    const lvl = await LevelModel.create({
      userId: TestId.USER,
      width: 1,
      height: 1,
      ts: TimerUtil.getTs(),
      slug: 'test/test-level-x',
      name: 'test level x',
      leastMoves: 1,
      isDraft: true, // important,
      isRanked: false,
      gameId: DEFAULT_GAME_ID,
      data: '43'
    });
    // call the publish endpoint

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: lvl._id,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await publishLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
      },
    });
  });
  test('processQueueMessages to generate image...', async () => {
    await processQueueMessages();
    // Note - we do not generate the image during test since we don't have an actual local server running to run puppet against.
  });
});
