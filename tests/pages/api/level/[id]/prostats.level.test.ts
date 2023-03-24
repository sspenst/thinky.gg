import ProStatsLevelType from '@root/constants/proStatsLevelType';
import Role from '@root/constants/role';
import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserModel } from '@root/models/mongoose';
import handler from '@root/pages/api/level/[id]/prostats/[type]';
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

async function query({ type, expectedError, expectedStatus, additionalAssertions }: {
    type: ProStatsLevelType,
    expectedError?: string,
    expectedStatus: number,
    additionalAssertions?: (response: any) => Promise<void>,
    }) {
  await testApiHandler({
    handler: async (_, res) => {
      const req: NextApiRequestWithAuth = {
        method: 'GET',
        query: {
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
      type: ProStatsLevelType.CommunityStepData,
      expectedError: 'Not authorized',
      expectedStatus: 401,

    });
  });
  test('should be able to get CommunityStepData now on promode', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO_SUBSCRIBER
      }
    });

    await query({
      type: ProStatsLevelType.CommunityStepData,
      expectedStatus: 200,
      additionalAssertions: async (response: any) => {
        expect(response[ProStatsLevelType.CommunityStepData]).toBeDefined();
        expect(response[ProStatsLevelType.PlayAttemptsOverTime]).toBeUndefined();
        expect(response[ProStatsLevelType.CommunityStepData].length).toBe(0); // TODO - would be good to add some score history to test the response
      }
    });
  });
  test('should be able to get PlayAttemptsOverTime now on promode', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO_SUBSCRIBER
      }
    });

    await query({
      type: ProStatsLevelType.PlayAttemptsOverTime,
      expectedStatus: 200,
      additionalAssertions: async (response: any) => {
        expect(response[ProStatsLevelType.PlayAttemptsOverTime]).toBeDefined();
        expect(response[ProStatsLevelType.CommunityStepData]).toBeUndefined();
        expect(response[ProStatsLevelType.PlayAttemptsOverTime].length).toBe(0); // TODO - would be good to add some score history to test the response
      }
    });
  });
});
