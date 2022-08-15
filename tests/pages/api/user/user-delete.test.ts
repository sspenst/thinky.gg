import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import modifyUserHandler from '../../../../pages/api/user/index';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
enableFetchMocks();

describe('pages/api/collection/index.ts', () => {
  const cookie = getTokenCookieValue(TestId.USER);

  test('Deleting a user should work', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'DELETE',
          cookies: {
            token: cookie,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.updated).toBe(true);
        expect(res.status).toBe(200);
      },
    });
  });
  test('Even though we have a valid token, user should not be found if they have been deleted', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: cookie,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.success).toBeUndefined();
        expect(response.error).toBeDefined();
        expect(response.error).toBe('Unauthorized: User not found');
        expect(res.status).toBe(401);
      },
    });
  });
});
