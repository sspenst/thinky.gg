import ProStatsLevelType from '@root/constants/proStatsLevelType';
import Role from '@root/constants/role';
import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserModel } from '@root/models/mongoose';
import handler from '@root/pages/api/level/[id]/prostats';
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

async function query({ expectedError, expectedStatus, additionalAssertions }: {
  expectedError?: string,
  expectedStatus: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalAssertions?: (response: any) => Promise<void>,
}) {
  await testApiHandler({
    pagesHandler: async (_, res) => {
      const req: NextApiRequestWithAuth = {
        method: 'GET',
        query: {
          id: TestId.LEVEL,
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
      expectedStatus: 200,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      additionalAssertions: async (response: any) => {
        expect(response[ProStatsLevelType.CommunityStepData]).toBeDefined();
        // TODO: should only contain solves equal to the least moves for non pro
        expect(response[ProStatsLevelType.CommunityStepData].length).toBe(1);
        expect(response[ProStatsLevelType.PlayAttemptsOverTime]).toBeUndefined();
      }
    });
  });
  test('should be able to get PlayAttemptsOverTime now on promode', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });

    await query({
      expectedStatus: 200,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      additionalAssertions: async (response: any) => {
        expect(response[ProStatsLevelType.CommunityStepData]).toBeDefined();
        expect(response[ProStatsLevelType.CommunityStepData].length).toBe(2);
        expect(response[ProStatsLevelType.PlayAttemptsOverTime]).toBeDefined();
        expect(response[ProStatsLevelType.PlayAttemptsOverTime].length).toBe(0);
      }
    });
  });
});
