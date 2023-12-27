import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import { NextApiRequestWrapper } from '@root/helpers/apiWrapper';
import { TimerUtil } from '@root/helpers/getTs';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { LevelModel } from '@root/models/mongoose';
import { processQueueMessages } from '@root/pages/api/internal-jobs/worker';
import generateImageHandler from '@root/pages/api/level/image/[id]';
import publishLevelHandler from '@root/pages/api/publish/[id]';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';

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
      handler: async (_, res) => {
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
  test('Now we should NOT able to get the level image since we have not generated it yet', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            id: TestId.LEVEL,
          },
        } as unknown as NextApiRequestWrapper;

        await generateImageHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(404);
      },
    });
  });
  test('processQueueMessages to generate image...', async () => {
    await processQueueMessages();
    // Note - we do not generate the image during test since we don't have an actual local server running to run puppet against.
  });
});
