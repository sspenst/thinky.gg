import AchievementType from '@root/constants/achievements/achievementType';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { AchievementModel, LevelModel, ReviewModel } from '../../../../models/mongoose';
import { processQueueMessages } from '../../../../pages/api/internal-jobs/worker';
import reviewLevelHandler, { getScoreEmojis } from '../../../../pages/api/review/[id]';

let review_id: string;

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

describe('Reviewing levels should work correctly', () => {
  test('Wrong HTTP method should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PATCH',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

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

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Testing POSTing without query should fail', async () => {
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

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid body.score, query.id');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Testing POSTing with missing score parameter should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            text: 'great game',
            // missing score
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

        expect(response.error).toBe('Invalid body.score');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Testing POSTing with no score AND empty text should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_3,
          },
          body: {
            score: 0,
            text: '',
            // missing score
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

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Testing creating but target level is not published', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            text: 'great game',
            score: 3,
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
  test('Testing creating with correct parameters but DB errors out', async () => {
    // publishing level for testing
    await LevelModel.findByIdAndUpdate(TestId.LEVEL_2, {
      $set: {
        isDraft: false,
      },
    });
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    jest.spyOn(ReviewModel, 'create').mockImplementation(() => {
      throw new Error('Test DB error');
    }
    );
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            text: 'great game',
            score: 3,

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

        expect(response.error).toBe('Error creating review');
        expect(res.status).toBe(500);
      },
    });
  });
  test('Testing POSTing with a level that the user has already review should not work', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL,
          },
          body: {
            text: 'great game',
            score: 3,
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

        expect(response.error).toBe('You already reviewed this level');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Testing POSTing with malformed score should not work', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            text: 'great game',
            score: 'five stars',
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

        expect(response.error).toBe('Invalid body.score');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Testing POSTing with a number that is not a 0.5 increment should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            text: 'great game',
            score: 3.25,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const lvl = await LevelModel.findById(TestId.LEVEL_2);

        expect(lvl.calc_reviews_count).toBe(0); // before creating the review
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(400);
        expect(response.error).toBe('Invalid body.score');
      },
    });
  });
  test('Testing POSTing with a number that is out of bounds should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            text: 'great game',
            score: 9,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const lvl = await LevelModel.findById(TestId.LEVEL_2);

        expect(lvl.calc_reviews_count).toBe(0); // before creating the review
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(400);
        expect(response.error).toBe('Invalid body.score');
      },
    });
  });
  test('Testing POSTing with text that is over 1024*5 characters should NOT work', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            text: 't'.repeat(1024 * 5 + 1),
            score: 3,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const lvl = await LevelModel.findById(TestId.LEVEL_2);

        expect(lvl.calc_reviews_count).toBe(0); // before creating the review
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(500);
        expect(response.error).toBe('Error creating review');
      },
    });
  });
  test('Testing PUT before review exists', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            text: 't'.repeat(100),
            score: 3.5,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const lvl = await LevelModel.findById(TestId.LEVEL_2);

        expect(lvl.calc_reviews_count).toBe(0); // before creating the review
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(404);
        expect(response.error).toBe('Error finding Review');
      },
    });
  });
  test('Testing POSTing with correct parameters should work', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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
        const response = await res.json();
        const processQueueRes = await processQueueMessages();

        // query for achievements
        const achievements = await AchievementModel.find({ userId: TestId.USER });

        expect(achievements.length).toBe(1);
        expect(achievements[0].type).toBe(AchievementType.REVIEWED_1_LEVEL);

        expect(response.error).toBeUndefined();
        expect(response.score).toBe(3.5);
        expect(response.text).toBe('t'.repeat(500));
        expect(response.levelId).toBe(TestId.LEVEL_2);
        review_id = response._id.toString();
        expect(res.status).toBe(200);
        const review = await ReviewModel.findById(review_id);

        expect(review).toBeDefined();

        expect(review.text).toBe('t'.repeat(500));
        expect(review.score).toBe(3.5);
        expect(review.levelId._id.toString()).toBe(TestId.LEVEL_2);

        expect(processQueueRes).toBe('Processed 5 messages with no errors');

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
    }
    );

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            text: 'bad game',
            score: 2,
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
        const review = await ReviewModel.findById(review_id);

        expect(review).toBeDefined();
        expect(review.text).toBe('t'.repeat(500)); // should not have changed
        expect(review.score).toBe(3.5);
        expect(review.levelId._id.toString()).toBe(TestId.LEVEL_2);
      },
    });
  });
  test('Testing editing review on invalid level', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: new Types.ObjectId(),
          },
          body: {
            score: 5,
            text: 'bad game'
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

        expect(processQueueRes).toBe('Processed 2 messages with no errors');
        expect(response.error).toBe('Level not found');

        expect(res.status).toBe(404);

        const review = await ReviewModel.findById(review_id);

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
      handler: async (_, res) => {
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
            text: 'bad game'
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
        expect(res.status).toBe(200);

        const review = await ReviewModel.findById(review_id);

        expect(review).toBeDefined();
        expect(review.text).toBe('bad game');
        expect(review.score).toBe(5);
        expect(review.levelId._id.toString()).toBe(TestId.LEVEL_2);
        const lvl = await LevelModel.findById(TestId.LEVEL_2);

        expect(lvl.calc_reviews_count).toBe(1);
        expect(lvl.calc_reviews_score_laplace.toFixed(2)).toBe('0.75');
      },
    });
  });
  test('Testing editing review but with score that is not 0.5 increment', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
          },
          body: {
            score: 3.3,
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
      handler: async (_, res) => {
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
        expect(res.status).toBe(200);

        const review = await ReviewModel.findById(review_id);

        expect(review).toBeDefined();
        expect(review.text).toBeUndefined();
        expect(review.score).toBe(5);
        expect(review.levelId._id.toString()).toBe(TestId.LEVEL_2);
      },
    });
  });
  test('Testing PUT with no score AND empty text should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_3,
          },
          body: {
            score: 0,
            text: '',
            // missing score
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

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Testing deleting review when DB errors out', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    jest.spyOn(ReviewModel, 'deleteOne').mockImplementation(() => {
      throw new Error('Test DB error');
    }
    );

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
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
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: new Types.ObjectId(),
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
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_2,
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
});
