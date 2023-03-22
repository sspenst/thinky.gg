import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { LevelModel, UserModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/stats/index';

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

const SOL_14 = ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown'];
const SOL_12 = ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowDown'];

async function sendStat(user: string, solution: string[]) {
  await testApiHandler({
    handler: async (_, res) => {
      const req: NextApiRequestWithAuth = {
        method: 'PUT',
        cookies: {
          token: getTokenCookieValue(user),
        },

        body: {
          codes: solution,
          levelId: TestId.LEVEL
        },
        headers: {
          'content-type': 'application/json',
        },
      } as unknown as NextApiRequestWithAuth;

      await handler(req, res);
    },
    test: async ({ fetch }) => {
      const res = await fetch();

      expect(res.status).toBe(200);
    }
  });
}

test('Doing a PUT from USER with 14 step solution and 12 step solution RIGHT after', async () => {
  await Promise.all([
    sendStat(TestId.USER_C, SOL_14),
    sendStat(TestId.USER_B, SOL_12),
    sendStat(TestId.USER, SOL_14),

  ]);
  const lvl = await LevelModel.findById(TestId.LEVEL);

  expect(lvl.leastMoves).toBe(12);
});
