import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { TimerUtil } from '../../../../helpers/getTs';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { LevelModel } from '../../../../models/mongoose';
import latestLevelsHandler from '../../../../pages/api/latest-levels/index';

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

describe('Testing latest levels api', () => {
  test('Calling with wrong http method should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await latestLevelsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Calling with correct http method should be OK', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await latestLevelsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.length).toBe(3);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Should always be limited to 15 levels and should only return non-drafts', async () => {
    const promises = [];

    for (let i = 0; i < 30; i++) {
      promises.push(LevelModel.create({
        _id: new Types.ObjectId(),
        authorNote: 'level ' + i + ' author note',
        data: '40000\n12000\n05000\n67890\nABCD3',
        gameId: DEFAULT_GAME_ID,
        height: 5,
        isDraft: i % 10 === 0,
        isRanked: false,
        leastMoves: 20,
        name: 'level ' + i,
        slug: 'test/level-' + i,
        ts: TimerUtil.getTs() + i,
        userId: TestId.USER,
        width: 5,
      }));
    }

    await Promise.all(promises);
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await latestLevelsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.length).toBe(15);
        expect(res.status).toBe(200);

        for (let i = 0; i < response.length; i++) {
          const lvlDB = await LevelModel.findById(response[i]._id);

          expect(lvlDB.isDraft).toBe(false);
        }
      },
    });
  }, 30000);
  test('If mongo query returns null we should fail gracefully', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(LevelModel, 'aggregate').mockImplementation(() => {
      return [] as never;
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await latestLevelsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response).toHaveLength(0);
        expect(res.status).toBe(200);
      },
    });
  });
  test('If mongo query throw exception we should fail gracefully', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    jest.spyOn(LevelModel, 'aggregate').mockImplementation(() => {
      throw new Error('Error finding Levels');
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await latestLevelsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding Levels');
        expect(res.status).toBe(500);
      },
    });
  });
});
