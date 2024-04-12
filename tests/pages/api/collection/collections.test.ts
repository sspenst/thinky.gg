import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { CollectionWithLevel } from '../../../../models/db/collection';
import collectionsHandler from '../../../../pages/api/collections';

afterAll(async() => {
  await dbDisconnect();
});
beforeAll(async () => {
  await dbConnect();
});
enableFetchMocks();
describe('pages/api/collections.ts', () => {
  test('GET collections', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {},
        } as unknown as NextApiRequestWithAuth;

        await collectionsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json() as CollectionWithLevel[];

        expect(response.length).toBe(2);
        expect(res.status).toBe(200);
      },
    });
  });
  test('GET collections with level id', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          userId: TestId.USER,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.LEVEL_3,
          },
        } as unknown as NextApiRequestWithAuth;

        await collectionsHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json() as CollectionWithLevel[];

        expect(response.length).toBe(2);
        expect(response[0].containsLevel).toBe(false);
        expect(response[1].containsLevel).toBe(true);
        expect(res.status).toBe(200);
      },
    });
  });
});
