import { UserModel } from '@root/models/mongoose';
import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { TimerUtil } from '../../../../helpers/getTs';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import withAuth, { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import modifyUserHandler from '../../../../pages/api/user/[id]/index';
import { ProfileQueryType } from '@root/constants/profileQueryType';
import User from '@root/models/db/user';
import { difficultyList } from '@root/components/formatted/formattedDifficulty';

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
        ).toStrictEqual({ "-1": 2 }); // -1 stands for pending
        expect(((response[ProfileQueryType.User]) as User).score).toBe(2);
      },
    });
  });
});
