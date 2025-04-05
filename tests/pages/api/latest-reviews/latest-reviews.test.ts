import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import GraphType from '../../../../constants/graphType';
import TestId from '../../../../constants/testId';
import { TimerUtil } from '../../../../helpers/getTs';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { GraphModel, LevelModel, ReviewModel } from '../../../../models/mongoose';
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
  test('Should always be limited to 10 reviews', async () => {
    const promises = [];

    for (let i = 0; i < 25; i++) {
      const levelId = new Types.ObjectId();

      promises.push(LevelModel.create({
        _id: levelId,
        data: '40000\n12000\n05000\n67890\nABCD3',
        gameId: DEFAULT_GAME_ID,
        height: 5,
        isDraft: false,
        isRanked: false,
        leastMoves: i + 1,
        name: `review-level-${i}`,
        slug: `test/review-level-${i}`,
        ts: TimerUtil.getTs(),
        userId: TestId.USER,
        width: 5,
      }));

      promises.push(ReviewModel.create({
        _id: new Types.ObjectId(),
        gameId: DEFAULT_GAME_ID,
        levelId: levelId,
        score: 5,
        text: 'My review ' + i,
        ts: TimerUtil.getTs(),
        userId: TestId.USER,
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
      throw new Error('Error finding Reviews');
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
      gameId: DEFAULT_GAME_ID,
      levelId: new Types.ObjectId(),
      score: 1,
      ts: TimerUtil.getTs(),
      userId: TestId.USER
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
  test('Should filter out reviews from blocked users', async () => {
    // Create a test level by USER_B
    const levelByBlockedUser = new Types.ObjectId();

    await LevelModel.create({
      _id: levelByBlockedUser,
      data: '40000\n12000\n05000\n67890\nABCD3',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: false,
      isRanked: false,
      leastMoves: 10,
      name: 'level-by-blocked-user',
      slug: 'test/level-by-blocked-user',
      ts: TimerUtil.getTs(),
      userId: TestId.USER_B,
      width: 5,
    });

    // Add a review by USER_B
    await ReviewModel.create({
      _id: new Types.ObjectId(),
      gameId: DEFAULT_GAME_ID,
      levelId: new Types.ObjectId(), // Some random level
      score: 5,
      text: 'Review from blocked user',
      ts: TimerUtil.getTs() + 1000, // Make this the most recent
      userId: TestId.USER_B,
    });

    // Add a review on level by USER_B
    await ReviewModel.create({
      _id: new Types.ObjectId(),
      gameId: DEFAULT_GAME_ID,
      levelId: levelByBlockedUser, // Level by blocked user
      score: 5,
      text: 'Review on level by blocked user',
      ts: TimerUtil.getTs() + 900, // Make this recent
      userId: TestId.USER_C,
    });

    // Create block relationship
    await GraphModel.create({
      source: TestId.USER,
      sourceModel: 'User',
      type: GraphType.BLOCK,
      target: TestId.USER_B,
      targetModel: 'User',
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER), // User who blocked USER_B
          },
          body: {},
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
        expect(res.status).toBe(200);

        // Verify no reviews by blocked user are returned
        const hasReviewsByBlockedUser = response.some(
          (review: any) => review.userId._id === TestId.USER_B
        );

        expect(hasReviewsByBlockedUser).toBe(false);

        // Verify no reviews on levels by blocked user are returned
        const hasReviewsOnBlockedUserLevels = response.some(
          (review: any) => review.levelId.userId._id === TestId.USER_B
        );

        expect(hasReviewsOnBlockedUserLevels).toBe(false);

        // Clean up
        await GraphModel.deleteOne({
          source: TestId.USER,
          target: TestId.USER_B,
          type: GraphType.BLOCK,
        });
      },
    });
  }, 30000);
});
