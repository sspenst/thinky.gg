import { ProfileQueryType } from '@root/constants/profileQueryType';
import User from '@root/models/db/user';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import modifyUserHandler from '../../../../pages/api/user/[id]/index';

afterEach(() => {
  jest.restoreAllMocks();
});
beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

describe('pages/api/user/[id]/index.ts', () => {
  test('GET a user should return data', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          query: {
            id: TestId.USER,
            type: [
              ProfileQueryType.LevelsSolvedByDifficulty,
              ProfileQueryType.User,
            ].join(','),
          },
        } as unknown as NextApiRequestWithAuth;

        await modifyUserHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.error).toBe(undefined);
        expect(response).toBeDefined();
        expect(
          response[ProfileQueryType.LevelsSolvedByDifficulty]
        ).toStrictEqual({ '-1': 2 }); // -1 stands for pending
        expect(((response[ProfileQueryType.User]) as User).config?.calcLevelsSolvedCount).toBe(2);
      },
    });
  });
});
