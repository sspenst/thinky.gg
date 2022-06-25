import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { ObjectId } from 'bson';
import { ReviewModel } from '../../../../models/mongoose';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { enableFetchMocks } from 'jest-fetch-mock';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import getTs from '../../../../helpers/getTs';
import latestReviewsHandler from '../../../../pages/api/latest-reviews/index';
import { testApiHandler } from 'next-test-api-route-handler';

const USER_ID_FOR_TESTING = '600000000000000000000000';
const LEVEL_ID_FOR_TESTING = '600000000000000000000002';

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Testing latest reviews api', () => {
  test('Calling with wrong http method should fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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
        expect(response.length).toBe(1);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Should always be limited to 10 reviews', async () => {
    for (let i = 0; i < 25; i++) {
      await ReviewModel.create({
        _id: new ObjectId(),
        levelId: LEVEL_ID_FOR_TESTING,
        score: 5,
        text: 'My review ' + i,
        ts: getTs(),
        userId: USER_ID_FOR_TESTING
      });
    }

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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
        expect(response.length).toBe(10);
        expect(res.status).toBe(200);

      },
    });
  }, 30000);
  test('If mongo query returns null we should fail gracefully', async () => {

    jest.spyOn(ReviewModel, 'find').mockReturnValueOnce({

      populate: function() {
        return {
          populate: function() {
            return { sort: function() {
              return { limit: function() {
                return null;
              }
              };
            }
            };
          }
        };
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ReviewModel, 'find').mockReturnValueOnce({ 'thisobjectshouldthrowerror': true } as any);

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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
      _id: new ObjectId(),
      levelId: LEVEL_ID_FOR_TESTING,
      score: 1,
      ts: getTs(),
      userId: USER_ID_FOR_TESTING
    });

    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(USER_ID_FOR_TESTING),
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
        expect(response.length).toBe(10);
        // should not return the newest 1 star review without text
        expect(response[0].score).toBe(5);
        expect(res.status).toBe(200);

      },
    });
  }, 30000);
});
