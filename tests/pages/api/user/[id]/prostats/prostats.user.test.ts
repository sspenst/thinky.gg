import Role from '@root/constants/role';
import TestId from '@root/constants/testId';
import { ProStatsUserType } from '@root/hooks/useProStatsUser';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserModel } from '@root/models/mongoose';
import handler from '@root/pages/api/user/[id]/prostats/[type]';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
enableFetchMocks();

async function query({ userId, type, expectedError, expectedStatus, additionalAssertions }: {
    userId?: string,
    type: ProStatsUserType,
    expectedError?: string,
    expectedStatus: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    additionalAssertions?: (response: any) => Promise<void>,
    }) {
  await testApiHandler({
    handler: async (_, res) => {
      const req: NextApiRequestWithAuth = {
        method: 'GET',
        query: {
          id: userId || TestId.USER,
          type: type
        },
        cookies: {
          token: getTokenCookieValue(TestId.USER)
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

      expect(response.error).toBe(expectedError);
      expect(res.status).toBe(expectedStatus);

      if (additionalAssertions) {
        await additionalAssertions(response);
      }
    },
  });
}

describe('api/user/[id]/prostats/[type]', () => {
  test('should get unauthorized if not promode', async () => {
    await query({
      type: ProStatsUserType.DifficultyLevelsComparisons,
      expectedError: 'Not authorized',
      expectedStatus: 401,

    });
  });
  test('should be able to get ScoreHistory now on promode', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });

    await query({
      type: ProStatsUserType.ScoreHistory,
      expectedStatus: 200,
      additionalAssertions: async response => {
        expect(response[ProStatsUserType.DifficultyLevelsComparisons]).toBeUndefined();
        expect(response[ProStatsUserType.MostSolvesForUserLevels]).toBeUndefined();
        expect(response[ProStatsUserType.ScoreHistory]).toBeDefined();
        expect(response[ProStatsUserType.ScoreHistory].length).toBe(1);
      }
    });
  });
  test('should be able to get MostSolvesForUserLevels now on promode', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });

    await query({
      type: ProStatsUserType.MostSolvesForUserLevels,
      expectedStatus: 200,
      additionalAssertions: async response => {
        expect(response[ProStatsUserType.DifficultyLevelsComparisons]).toBeUndefined();
        expect(response[ProStatsUserType.ScoreHistory]).toBeUndefined();
        expect(response[ProStatsUserType.MostSolvesForUserLevels]).toBeDefined();
        expect(response[ProStatsUserType.MostSolvesForUserLevels].length).toBe(1);
      }
    });
  });
  test('should not be able to get DifficultyLevelsComparisons for another user', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });

    await query({
      userId: TestId.USER_B,
      type: ProStatsUserType.DifficultyLevelsComparisons,
      expectedStatus: 401,
      expectedError: 'Not authorized',
      additionalAssertions: async response => {
        expect(response[ProStatsUserType.ScoreHistory]).toBeUndefined();
        expect(response[ProStatsUserType.MostSolvesForUserLevels]).toBeUndefined();
        expect(response[ProStatsUserType.DifficultyLevelsComparisons]).toBeUndefined();
      }
    });
  });
  test('should be able to get DifficultyLevelsComparisons now on promode', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });

    await query({
      userId: TestId.USER,
      type: ProStatsUserType.DifficultyLevelsComparisons,
      expectedStatus: 200,
      additionalAssertions: async response => {
        expect(response[ProStatsUserType.ScoreHistory]).toBeUndefined();
        expect(response[ProStatsUserType.MostSolvesForUserLevels]).toBeUndefined();
        expect(response[ProStatsUserType.DifficultyLevelsComparisons]).toBeDefined();

        expect(response[ProStatsUserType.DifficultyLevelsComparisons].length).toBe(0); // TODO - would be good to add some score history to test the response
      }
    });
  });
});
