import { processQueueMessages } from '@root/pages/api/internal-jobs/worker';
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

beforeAll(async () => {
  //await dbConnect(); // see if that erroneous index error goes away when commenting this out...
});
afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('review.test.errors', () => {
  test('Testing POSTing with no score AND empty text should fail', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
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

        expect(response.error).toBe('Test DB error');
        expect(res.status).toBe(500);
      },
    });
  });
  test('Testing POSTing with a level that the user has already review should not work', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
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
        expect((response.error as string).startsWith('Review validation failed: text')).toBeTruthy();
      },
    });
  });
  test('Testing PUT before review exists', async () => {
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
            text: 't'.repeat(100),
            score: 3.5,
            userId: TestId.USER_B,
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
  test('Testing PUT with no score AND empty text should fail', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            id: TestId.LEVEL_3,
          },
          body: {
            score: 0,
            text: '',
            // missing score
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
        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
});
