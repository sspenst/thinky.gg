import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { LevelModel, ReviewModel } from '../../../../models/mongoose';
import reviewLevelHandler from '../../../../pages/api/review/[id]';

let review_id: string;

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

        expect(response.error).toBe('Invalid query.id');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Testing POSTing with missing parameters should fail', async () => {
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

        expect(response.error).toBe('Score must be between 0 and 5 in half increments');
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
        expect(response.error).toBe('Score must be between 0 and 5 in half increments');
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
            text: 'great game',
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

        expect(response.error).toBeUndefined();
        expect(response.score).toBe(3.5);
        expect(response.text).toBe('great game');
        expect(response.levelId).toBe(TestId.LEVEL_2);
        review_id = response._id.toString();
        expect(res.status).toBe(200);
        const review = await ReviewModel.findById(review_id);

        expect(review).toBeDefined();

        expect(review.text).toBe('great game');
        expect(review.score).toBe(3.5);
        expect(review.levelId._id.toString()).toBe(TestId.LEVEL_2);

        lvl = await LevelModel.findById(TestId.LEVEL_2);
        expect(lvl.calc_reviews_score_laplace.toFixed(2)).toBe('0.66');
        expect(lvl.calc_reviews_count).toBe(1);
      },
    });
  });
  test('Testing editing review when DB errors out', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(ReviewModel, 'updateOne').mockImplementation(() => {
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
        expect(review.text).toBe('great game'); // should not have changed
        expect(review.score).toBe(3.5);
        expect(review.levelId._id.toString()).toBe(TestId.LEVEL_2);
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

        expect(response.error).toBeUndefined();
        expect(response.modifiedCount).toBe(1);
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

        expect(response.error).toBeUndefined();
        expect(response.modifiedCount).toBe(1);
        expect(res.status).toBe(200);

        const review = await ReviewModel.findById(review_id);

        expect(review).toBeDefined();
        expect(review.text).toBeUndefined();
        expect(review.score).toBe(5);
        expect(review.levelId._id.toString()).toBe(TestId.LEVEL_2);
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

        expect(response.error).toBe('Error deleting review');
        expect(res.status).toBe(500);
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

        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
        expect(res.status).toBe(200);
        const lvl = await LevelModel.findById(TestId.LEVEL_2);

        expect(lvl.calc_reviews_count).toBe(0);
        expect(lvl.calc_reviews_score_laplace.toFixed(2)).toBe('0.67'); // default
      },
    });
  });
});
