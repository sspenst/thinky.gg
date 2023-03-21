import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import Review from '../../../../models/db/review';
import { ReviewModel } from '../../../../models/mongoose';
import reviewsLevelHandler from '../../../../pages/api/reviews/[id]';

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();
beforeAll(async () => {
  await dbConnect();
});
describe('pages/api/reviews', () => {
  test('Wrong method should return status code 405', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewsLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Missing query field should return 400', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewsLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid query.id');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Missing query.id field should return 400', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewsLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid query.id');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Malformed id', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            id: 'a',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewsLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid query.id');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Valid object id but not associated with a level, should just return empty array', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            id: new Types.ObjectId().toString(),
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewsLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response).toHaveLength(0);
      },
    });
  });
  test('Valid object id but query returning null', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            id: TestId.LEVEL
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewsLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        jest.spyOn(ReviewModel, 'find').mockReturnValueOnce({
          populate: function() {
            return {
              sort: function() {
                return null;
              }
            };
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(404);
        expect(response.error).toBe('Error finding Reviews');
      },
    });
  });
  test('Valid object id but not associated with a level, should just return empty array', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          query: {
            id: TestId.LEVEL,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await reviewsLevelHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response).toHaveLength(1);
        const rev = response[0] as Review;

        expect(rev.levelId).toBe(TestId.LEVEL);
        expect(rev.userId._id.toString()).toBe(TestId.USER);
        expect(rev.score).toBe(5);
        expect(rev.text).toBe('My best creation. I can\'t really imagine anything better.');
        expect(rev.ts).toBeGreaterThan(0);
      },
    });
  });
});
