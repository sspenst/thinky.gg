import AchievementType from '@root/constants/achievements/achievementType';
import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import GraphType from '../../../../constants/graphType';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { AchievementModel, GraphModel, LevelModel, ReviewModel } from '../../../../models/mongoose';
import { processQueueMessages } from '../../../../pages/api/internal-jobs/worker';
import reviewLevelHandler, { getScoreEmojis } from '../../../../pages/api/review/[id]';
import reviewsApiHandler from '../../../../pages/api/reviews/[id]';

beforeAll(async () => {
  await dbConnect(); // see if that erroneous index error goes away when commenting this out...
});
afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Reviewing levels should work correctly', () => {
  test('Testing POSTing with correct parameters should work', async () => {
    await LevelModel.findByIdAndUpdate(TestId.LEVEL_2, {
      $set: {
        isDraft: false,
      },
    });
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            text: 't'.repeat(500),
            score: 3.5,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        let lvl = await LevelModel.findById(TestId.LEVEL_2);

        expect(lvl.calc_reviews_count).toBe(0); // before creating the review
        const res = await fetch();

        expect(res.status).toBe(200);
        const response = await res.json();
        const processQueueRes = await processQueueMessages();

        expect(processQueueRes).toBe('Processed 5 messages with no errors');

        // query for achievements
        const achievements = await AchievementModel.find({ userId: TestId.USER_B });

        expect(achievements.length).toBe(1);
        expect(achievements[0].type).toBe(AchievementType.REVIEWED_1_LEVEL);
        expect(achievements[0].gameId).toBe(DEFAULT_GAME_ID);
        expect(response.error).toBeUndefined();
        expect(response.score).toBe(3.5);
        expect(response.text).toBe('t'.repeat(500));
        expect(response.gameId).toBe(DEFAULT_GAME_ID);
        expect(response.levelId).toBe(TestId.LEVEL_2);
        expect(res.status).toBe(200);

        lvl = await LevelModel.findById(TestId.LEVEL_2);
        expect(lvl.calc_reviews_score_laplace.toFixed(2)).toBe('0.66');
        expect(lvl.calc_reviews_count).toBe(1);
      },
    });
  });
  test('Testing editing review when DB errors out', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(ReviewModel, 'findOneAndUpdate').mockImplementation(() => {
      throw new Error('Test DB error');
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            text: 'bad game',
            score: 2,
            userId: TestId.USER_B,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Error updating review');
        expect(res.status).toBe(500);

        const review = await ReviewModel.findOne({
          levelId: new Types.ObjectId(TestId.LEVEL_2),
          userId: new Types.ObjectId(TestId.USER_B),
        });

        expect(review).toBeDefined();
        expect(review.text).toBe('t'.repeat(500)); // should not have changed
        expect(review.score).toBe(3.5);
        expect(review.levelId._id.toString()).toBe(TestId.LEVEL_2);
      },
    });
  });
  test('Testing editing review on invalid level', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: new Types.ObjectId(),
          },
          body: {
            score: 5,
            text: 'bad game',
            userId: TestId.USER_B,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        const processQueueRes = await processQueueMessages();

        expect(processQueueRes).toBe('Processed 4 messages with no errors');
        expect(response.error).toBe('Level not found');
        expect(res.status).toBe(404);

        const review = await ReviewModel.findOne({
          levelId: new Types.ObjectId(TestId.LEVEL_2),
          userId: new Types.ObjectId(TestId.USER_B),
        });

        expect(review).toBeDefined();
        expect(review.text).toBe('t'.repeat(500)); // should not have changed
        expect(review.score).toBe(3.5);
        expect(review.levelId._id.toString()).toBe(TestId.LEVEL_2);
        const lvl = await LevelModel.findById(TestId.LEVEL_2);

        expect(lvl.calc_reviews_count).toBe(1);
        expect(lvl.calc_reviews_score_laplace.toFixed(2)).toBe('0.66');
      },
    });
  });
  test('Testing editing review score and text', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            score: 5,
            text: 'bad game',
            userId: TestId.USER_B,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        const processQueueRes = await processQueueMessages();

        expect(processQueueRes).toBe('Processed 5 messages with no errors');
        expect(response.error).toBeUndefined();
        expect(response.levelId.toString()).toBe(TestId.LEVEL_2);
        expect(response.text).toBe('bad game');
        expect(response.score).toBe(5);
        expect(res.status).toBe(200);

        const lvl = await LevelModel.findById(TestId.LEVEL_2);

        expect(lvl.calc_reviews_count).toBe(1);
        expect(lvl.calc_reviews_score_laplace.toFixed(2)).toBe('0.75');
      },
    });
  });
  test('Testing editing review but with score that is not 0.5 increment', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            score: 3.3,
            userId: TestId.USER_B,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        const processQueueRes = await processQueueMessages();

        expect(processQueueRes).toBe('NONE');
        expect(response.error).toBe('Invalid body.score');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Testing editing review just score', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            score: 5,
            userId: TestId.USER_B,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        const processQueueRes = await processQueueMessages();

        expect(processQueueRes).toBe('Processed 5 messages with no errors');

        expect(response.error).toBeUndefined();
        expect(response.levelId.toString()).toBe(TestId.LEVEL_2);
        expect(response.text).toBeUndefined();
        expect(response.score).toBe(5);
        expect(res.status).toBe(200);
      },
    });
  });

  test('Testing editing review without userId', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            score: 5,
            text: 'bad game',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(400);
        expect(response.error).toBe('Invalid body.userId');
      },
    });
  });
  test('PUT review by a different user', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            score: 5,
            text: 'bad game',
            userId: TestId.USER_B,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(403);
        expect(response.error).toBe('Not authorized to edit this review');
      },
    });
  });
  test('PUT review by a curator', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_C),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            score: 0.5,
            text: 'curator was here',
            userId: TestId.USER_B,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        const processQueueRes = await processQueueMessages();

        expect(processQueueRes).toBe('Processed 5 messages with no errors');

        expect(response.error).toBeUndefined();
        expect(response.levelId.toString()).toBe(TestId.LEVEL_2);
        expect(response.text).toBe('curator was here');
        expect(response.score).toBe(0.5);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Testing deleting review when DB errors out', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    jest.spyOn(ReviewModel, 'deleteOne').mockImplementation(() => {
      throw new Error('Test DB error');
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: TestId.LEVEL_2,
            userId: TestId.USER_B,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        const processQueueRes = await processQueueMessages();

        expect(processQueueRes).toBe('NONE');

        expect(response.error).toBe('Error deleting review');
        expect(res.status).toBe(500);
      },
    });
  });
  test('Testing deleting review on unknown level', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: new Types.ObjectId(),
            userId: TestId.USER_B,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Level not found');
        expect(res.status).toBe(404);
      },
    });
  });
  test('Testing deleting review OK', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: TestId.LEVEL_2,
            userId: TestId.USER_B,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        const processQueueRes = await processQueueMessages();

        expect(processQueueRes).toBe('Processed 3 messages with no errors');
        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(TestId.LEVEL_2);

        expect(lvl.calc_reviews_count).toBe(0);
        expect(lvl.calc_reviews_score_laplace.toFixed(2)).toBe('0.67'); // default
      },
    });
  });
  test('DELETE review by a different user', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
            userId: TestId.USER_B,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Not authorized to delete this review');
        expect(res.status).toBe(403);
      },
    });
  });
  test('DELETE review by a curator', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER_C),
          },
          query: {
            id: TestId.LEVEL_2,
            userId: TestId.USER_B,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();
        const processQueueRes = await processQueueMessages();

        expect(processQueueRes).toBe('Processed 3 messages with no errors');
        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(TestId.LEVEL_2);

        expect(lvl.calc_reviews_count).toBe(0);
        expect(lvl.calc_reviews_score_laplace.toFixed(2)).toBe('0.67'); // default
      },
    });
  });
  test('getScoreEmojis', async () => {
    expect(getScoreEmojis(0)).toBe('');
    expect(getScoreEmojis(1.5)).toBe('<:fullstar:1045889520001892402><:halfstar:1045889518701654046>');
  });
  test('POST own level should remove score', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            text: 'hi',
            score: 3.5,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        await processQueueMessages();

        expect(response.error).toBeUndefined();
        expect(response.score).toBe(0);
        expect(response.text).toBe('hi');
        expect(response.levelId).toBe(TestId.LEVEL_2);
        expect(res.status).toBe(200);
      },
    });
  });
  test('PUT own level should remove score', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            text: 'hi\nEDIT: bye',
            score: 3.5,
            userId: TestId.USER,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        await processQueueMessages();

        expect(response.error).toBeUndefined();
        expect(response.score).toBe(0);
        expect(response.text).toBe('hi\nEDIT: bye');
        expect(response.levelId).toBe(TestId.LEVEL_2);
        expect(res.status).toBe(200);
      },
    });
  });

  // Test for blocked user reviews filtering
  test('Reviews API should filter out reviews from blocked users', async () => {
    // First create a block relationship
    await GraphModel.create({
      source: TestId.USER,
      sourceModel: 'User',
      type: GraphType.BLOCK,
      target: TestId.USER_B,
      targetModel: 'User',
    });

    // Then request reviews for a level as the user who has blocked USER_B
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as any; // Use any type to bypass TypeScript checks for this test

        await reviewsApiHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);

        // Verify no reviews from blocked users are present
        const hasBlockedUserReviews = response.some((review: any) =>
          review.userId._id.toString() === TestId.USER_B
        );

        expect(hasBlockedUserReviews).toBe(false);

        // Clean up the block for other tests
        await GraphModel.deleteOne({
          source: TestId.USER,
          target: TestId.USER_B,
          type: GraphType.BLOCK,
        });
      },
    });
  });
});
