import Direction from '@root/constants/direction';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { LevelModel } from '../../../../models/mongoose';
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

const SOL_14 = [Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.RIGHT, Direction.UP, Direction.LEFT, Direction.LEFT, Direction.DOWN, Direction.DOWN, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN];
const SOL_12 = [Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.DOWN, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.DOWN, Direction.LEFT, Direction.UP, Direction.DOWN, Direction.DOWN];

async function sendStat(user: string, solution: Direction[]) {
  await testApiHandler({
    handler: async (_, res) => {
      const req: NextApiRequestWithAuth = {
        method: 'PUT',
        cookies: {
          token: getTokenCookieValue(user),
        },

        body: {
          directions: solution,
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
