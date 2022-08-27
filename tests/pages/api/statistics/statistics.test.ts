import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import statisticsHandler from '../../../../pages/api/statistics/index';

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('Testing statistics api', () => {
  test('Calling with wrong http method should fail', async () => {
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

        await statisticsHandler(req, res);
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
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await statisticsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.topScorers).toBeDefined();
        expect(response.topReviewers).toBeDefined();
        expect(response.topRecordBreakers).toBeDefined();
        expect(response.newUsers).toBeDefined();
        expect(response.currentlyOnlineCount).toBeDefined();
        expect(response.registeredUsersCount).toBeDefined();
        expect(response.totalAttempts).toBeDefined();
        expect(res.status).toBe(200);
      },
    });
  });
});
