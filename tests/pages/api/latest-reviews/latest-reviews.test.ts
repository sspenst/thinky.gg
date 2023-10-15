import { GameId } from '@root/constants/GameId';
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
import { LevelModel, ReviewModel } from '../../../../models/mongoose';
import latestReviewsHandler from '../../../../pages/api/latest-reviews/index';

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

describe('Testing latest reviews api', () => {
  test('Calling with wrong http method should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
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

        await latestReviewsHandler(req, res);
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
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await latestReviewsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.length).toBe(1);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Should always be limited to 10 reviews', async () => {
    for (let i = 0; i < 25; i++) {
      const levelId = new Types.ObjectId();

      await LevelModel.create({
        _id: levelId,
        gameId: GameId.PATHOLOGY,
        leastMoves: i + 1,
        data: '40000\n12000\n05000\n67890\nABCD3',
        height: 5,
        isDraft: false,
        name: `review-level-${i}`,
        slug: `test/review-level-${i}`,
        ts: TimerUtil.getTs(),
        userId: TestId.USER,
        width: 5,
      });

      await ReviewModel.create({
        _id: new Types.ObjectId(),
        gameId: GameId.PATHOLOGY,
        levelId: levelId,
        score: 5,
        text: 'My review ' + i,
        ts: TimerUtil.getTs(),
        userId: TestId.USER,
      });
    }

    await testApiHandler({
      handler: async (_, res) => {
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

        await latestReviewsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.length).toBe(7);
        expect(res.status).toBe(200);
      },
    });
  }, 30000);
  test('If mongo query returns null we should fail gracefully', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    jest.spyOn(ReviewModel, 'aggregate').mockImplementationOnce(() => {
      return [] as never;
    });

    await testApiHandler({
      handler: async (_, res) => {
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

        await latestReviewsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding Reviews');
        expect(res.status).toBe(500);
      },
    });
  });
  test('If mongo query throw exception we should fail gracefully', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ReviewModel, 'aggregate').mockReturnValueOnce({ 'thisobjectshouldthrowerror': true } as any);

    await testApiHandler({
      handler: async (_, res) => {
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

        await latestReviewsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error finding Reviews');
        expect(res.status).toBe(500);
      },
    });
  });
  test('Should not return reviews without text', async () => {
    await ReviewModel.create({
      _id: new Types.ObjectId(),
      gameId: GameId.PATHOLOGY,
      levelId: new Types.ObjectId(),
      score: 1,
      ts: TimerUtil.getTs(),
      userId: TestId.USER
    });

    await testApiHandler({
      handler: async (_, res) => {
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

        await latestReviewsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.length).toBe(7);
        // should not return the newest 1 star review without text
        expect(response[0].score).toBe(5);
        expect(res.status).toBe(200);
      },
    });
  }, 30000);
});
