import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import handler from '../../../../pages/api/levels/index';

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

describe('pages/api/levels', () => {
  test('should return levels in original order', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            ids: [
              TestId.LEVEL_3,
              TestId.LEVEL,
              TestId.LEVEL_2, // LEVEL_2 is draft

              TestId.LEVEL_4
            ]
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response).toHaveLength(3);
        expect(response[0]._id.toString()).toBe(TestId.LEVEL_3);
        expect(response[1]._id.toString()).toBe(TestId.LEVEL);
        expect(response[2]._id.toString()).toBe(TestId.LEVEL_4);
      },
    });
  });
});
