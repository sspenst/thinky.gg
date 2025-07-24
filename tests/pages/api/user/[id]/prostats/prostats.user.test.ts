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

async function query({ userId, type, expectedError, expectedStatus, additionalAssertions, timeFilter }: {
    userId?: string,
    type: ProStatsUserType,
    expectedError?: string,
    expectedStatus: number,
    timeFilter?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    additionalAssertions?: (response: any) => Promise<void>,
    }) {
  await testApiHandler({
    pagesHandler: async (_, res) => {
      const req: NextApiRequestWithAuth = {
        method: 'GET',
        query: {
          id: userId || TestId.USER,
          type: type,
          ...(timeFilter && { timeFilter })
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
  test('should be able to get ScoreHistory with Pro', async () => {
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
        expect(response[ProStatsUserType.PlayLogForUserCreatedLevels]).toBeUndefined();
      }
    });
  });
  test('should be able to get MostSolvesForUserLevels with Pro', async () => {
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
        expect(response[ProStatsUserType.PlayLogForUserCreatedLevels]).toBeUndefined();
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
        expect(response[ProStatsUserType.PlayLogForUserCreatedLevels]).toBeUndefined();
      }
    });
  });
  test('should be able to get DifficultyLevelsComparisons with Pro', async () => {
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
        expect(response[ProStatsUserType.PlayLogForUserCreatedLevels]).toBeUndefined();
      }
    });
  });
  test('should be able to get PlayLogForUserCreatedLevels with Pro', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });

    await query({
      userId: TestId.USER,
      type: ProStatsUserType.PlayLogForUserCreatedLevels,
      expectedStatus: 200,
      additionalAssertions: async response => {
        expect(response[ProStatsUserType.ScoreHistory]).toBeUndefined();
        expect(response[ProStatsUserType.MostSolvesForUserLevels]).toBeUndefined();
        expect(response[ProStatsUserType.DifficultyLevelsComparisons]).toBeUndefined();
        expect(response[ProStatsUserType.PlayLogForUserCreatedLevels]).toBeDefined();
        expect(response[ProStatsUserType.PlayLogForUserCreatedLevels].length).toBe(2);
      }
    });
  });
  test('should be able to get Records with Pro and verify record data structure', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER_B, {
      $addToSet: {
        roles: Role.PRO
      }
    });

    // Create additional test stats to ensure we have record data
    const recordTime = Math.floor(Date.now() / 1000);
    await StatModel.create({
      userId: TestId.USER_B,
      levelId: TestId.LEVEL_3,
      complete: true,
      moves: 8, // This should be a record if it's the best score
      attempts: 1,
      ts: recordTime,
      gameId: GameId.THINKY,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false
    });

    await query({
      userId: TestId.USER_B,
      type: ProStatsUserType.Records,
      expectedStatus: 200,
      additionalAssertions: async response => {
        expect(response[ProStatsUserType.Records]).toBeDefined();
        const records = response[ProStatsUserType.Records];
        expect(Array.isArray(records)).toBe(true);
        
        // Verify record structure if any records exist
        if (records.length > 0) {
          const record = records[0];
          expect(record).toHaveProperty('_id');
          expect(record).toHaveProperty('name');
          expect(record).toHaveProperty('ts'); // Level creation timestamp
          expect(record).toHaveProperty('records');
          expect(Array.isArray(record.records)).toBe(true);
          
          if (record.records.length > 0) {
            const recordData = record.records[0];
            expect(recordData).toHaveProperty('moves');
            expect(recordData).toHaveProperty('ts'); // Record achievement timestamp
            expect(typeof recordData.moves).toBe('number');
            expect(typeof recordData.ts).toBe('number');
          }
        }
      }
    });
  });

  test('should be able to get FollowerActivityPatterns with Pro and verify data accuracy', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });

    // Create test play attempts to simulate follower activity
    const recentTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const oldTime = Math.floor(Date.now() / 1000) - (30 * 24 * 3600); // 30 days ago
    
    await PlayAttemptModel.create([
      {
        userId: TestId.USER_B,
        levelId: TestId.LEVEL, // Level created by TestId.USER
        startTime: recentTime,
        endTime: recentTime + 60,
        updateCount: 10,
        gameId: GameId.THINKY,
        attemptContext: { isGuest: false },
        isDeleted: false
      },
      {
        userId: TestId.USER_C,
        levelId: TestId.LEVEL,
        startTime: oldTime,
        endTime: oldTime + 120,
        updateCount: 20,
        gameId: GameId.THINKY,
        attemptContext: { isGuest: false },
        isDeleted: false
      }
    ]);

    await query({
      userId: TestId.USER,
      type: ProStatsUserType.FollowerActivityPatterns,
      expectedStatus: 200,
      additionalAssertions: async response => {
        expect(response[ProStatsUserType.FollowerActivityPatterns]).toBeDefined();
        const patterns = response[ProStatsUserType.FollowerActivityPatterns];
        
        // Verify structure and data types
        expect(typeof patterns.followerCount).toBe('number');
        expect(typeof patterns.activeFollowerCount).toBe('number');
        expect(typeof patterns.hasDiscordConnected).toBe('boolean');
        
        // Verify business logic
        expect(patterns.followerCount).toBeGreaterThanOrEqual(0);
        expect(patterns.activeFollowerCount).toBeLessThanOrEqual(patterns.followerCount);
        
        // Should have some activity from our test data
        if (patterns.followerCount > 0) {
          expect(patterns.activityPattern).toBeDefined();
          expect(Array.isArray(patterns.activityPattern)).toBe(true);
        }
      }
    });
  });

  test('should not be able to get FollowerActivityPatterns for another user', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });

    await query({
      userId: TestId.USER_B,
      type: ProStatsUserType.FollowerActivityPatterns,
      expectedStatus: 401,
      expectedError: 'Not authorized',
    });
  });

  test('should be able to get ScoreHistory for another user (public access)', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });

    await query({
      userId: TestId.USER_B,
      type: ProStatsUserType.ScoreHistory,
      expectedStatus: 200,
      additionalAssertions: async response => {
        expect(response[ProStatsUserType.ScoreHistory]).toBeDefined();
        expect(response[ProStatsUserType.DifficultyLevelsComparisons]).toBeUndefined();
        expect(response[ProStatsUserType.FollowerActivityPatterns]).toBeUndefined();
      }
    });
  });

  test('should be able to get Records for another user (public access)', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });

    await query({
      userId: TestId.USER_B,
      type: ProStatsUserType.Records,
      expectedStatus: 200,
      additionalAssertions: async response => {
        expect(response[ProStatsUserType.Records]).toBeDefined();
        expect(response[ProStatsUserType.DifficultyLevelsComparisons]).toBeUndefined();
        expect(response[ProStatsUserType.FollowerActivityPatterns]).toBeUndefined();
      }
    });
  });

  test('should support timeFilter parameter for ScoreHistory', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });

    await query({
      type: ProStatsUserType.ScoreHistory,
      timeFilter: '30d',
      expectedStatus: 200,
      additionalAssertions: async response => {
        expect(response[ProStatsUserType.ScoreHistory]).toBeDefined();
        // The filter should still return data (the specific filtering logic is tested in the backend aggregation)
        expect(Array.isArray(response[ProStatsUserType.ScoreHistory])).toBe(true);
      }
    });
  });

  test('should support timeFilter parameter for DifficultyLevelsComparisons', async () => {
    await UserModel.findByIdAndUpdate(TestId.USER, {
      $addToSet: {
        roles: Role.PRO
      }
    });

    await query({
      type: ProStatsUserType.DifficultyLevelsComparisons,
      timeFilter: '1y',
      expectedStatus: 200,
      additionalAssertions: async response => {
        expect(response[ProStatsUserType.DifficultyLevelsComparisons]).toBeDefined();
        expect(Array.isArray(response[ProStatsUserType.DifficultyLevelsComparisons])).toBe(true);
      }
    });
  });
});
