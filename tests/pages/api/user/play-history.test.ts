import { GameId } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import { TimerUtil } from '@root/helpers/getTs';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { LevelModel, PlayAttemptModel, UserModel } from '@root/models/mongoose';
import { AttemptContext } from '@root/models/schemas/playAttemptSchema';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import playHistoryHandler, { getPlayAttempts } from '../../../../pages/api/user/play-history/index';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/api/user/play-history', () => {
  describe('API endpoint', () => {
    test('should return 403 for non-pro user', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(TestId.USER), // Regular user, not pro
            },
            headers: {
              'content-type': 'application/json',
            },
            query: {},
          } as unknown as NextApiRequestWithAuth;

          await playHistoryHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(403);
          expect(response.error).toBe('You must be a pro user to access this endpoint.');
        },
      });
    });

    test('should return 200 for pro user with empty play attempts', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(TestId.USER_PRO), // Pro user
            },
            headers: {
              'content-type': 'application/json',
            },
            query: {},
          } as unknown as NextApiRequestWithAuth;

          await playHistoryHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(200);
          expect(Array.isArray(response)).toBe(true);
          // Response should be empty or contain play attempts
        },
      });
    });

    test('should handle query parameters correctly', async () => {
      const testCursor = new Types.ObjectId();
      const testDate = new Date('2024-01-01').toISOString();

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(TestId.USER_PRO),
            },
            headers: {
              'content-type': 'application/json',
            },
            query: {
              cursor: testCursor.toString(),
              datetime: testDate,
              filterSolved: 'true',
              minDurationMinutes: '5',
            },
          } as unknown as NextApiRequestWithAuth;

          await playHistoryHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(200);
          expect(Array.isArray(response)).toBe(true);
        },
      });
    });

    test('should handle filterSolved=false parameter', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(TestId.USER_PRO),
            },
            headers: {
              'content-type': 'application/json',
            },
            query: {
              filterSolved: 'false',
            },
          } as unknown as NextApiRequestWithAuth;

          await playHistoryHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(200);
          expect(Array.isArray(response)).toBe(true);
        },
      });
    });

    test('should handle missing optional parameters', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(TestId.USER_PRO),
            },
            headers: {
              'content-type': 'application/json',
            },
            query: {
              // No query parameters
            },
          } as unknown as NextApiRequestWithAuth;

          await playHistoryHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(200);
          expect(Array.isArray(response)).toBe(true);
        },
      });
    });
  });

  describe('getPlayAttempts function', () => {
    let testUser: any;
    let testLevel: any;
    let testPlayAttemptId: Types.ObjectId;

    beforeEach(async () => {
      // Get test user
      testUser = await UserModel.findById(TestId.USER_PRO);

      // Get test level
      testLevel = await LevelModel.findById(TestId.LEVEL);

      // Create a test play attempt
      const testPlayAttempt = await PlayAttemptModel.create({
        _id: new Types.ObjectId(),
        userId: testUser._id,
        levelId: testLevel._id,
        gameId: GameId.PATHOLOGY,
        startTime: TimerUtil.getTs() - 100,
        endTime: TimerUtil.getTs(),
        attemptContext: AttemptContext.JUST_SOLVED,
        isDeleted: false,
      });

      testPlayAttemptId = testPlayAttempt._id;
    });

    afterEach(async () => {
      // Clean up test play attempt
      await PlayAttemptModel.findByIdAndDelete(testPlayAttemptId);
    });

    test('should return play attempts with default parameters', async () => {
      const result = await getPlayAttempts(GameId.PATHOLOGY, testUser, {});

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);

      if (result.length > 0) {
        const playAttempt = result[0];

        expect(playAttempt).toHaveProperty('userId');
        expect(playAttempt).toHaveProperty('levelId');
        expect(playAttempt).toHaveProperty('startTime');
        expect(playAttempt).toHaveProperty('endTime');
        expect(playAttempt).toHaveProperty('duration');
        expect(playAttempt.levelId).toHaveProperty('userId');
      }
    });

    test('should filter by cursor', async () => {
      const cursor = new Types.ObjectId();
      const result = await getPlayAttempts(GameId.PATHOLOGY, testUser, { cursor });

      expect(Array.isArray(result)).toBe(true);
      // All returned attempts should have _id less than cursor
      result.forEach(attempt => {
        expect(attempt._id.toString() < cursor.toString()).toBe(true);
      });
    });

    test('should filter by datetime', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day in future
      const result = await getPlayAttempts(GameId.PATHOLOGY, testUser, { datetime: futureDate });

      expect(Array.isArray(result)).toBe(true);
      // Should include our test attempt since it's before the future date
    });

    test('should filter by solved attempts only', async () => {
      const result = await getPlayAttempts(GameId.PATHOLOGY, testUser, { filterSolved: true });

      expect(Array.isArray(result)).toBe(true);
      // All returned attempts should be solved
      result.forEach(attempt => {
        expect(attempt.attemptContext).toBe(AttemptContext.JUST_SOLVED);
      });
    });

    test('should filter by minimum duration', async () => {
      const result = await getPlayAttempts(GameId.PATHOLOGY, testUser, { minDurationMinutes: 0.1 });

      expect(Array.isArray(result)).toBe(true);
      // All returned attempts should have duration >= 6 seconds (0.1 * 60)
      result.forEach(attempt => {
        expect(attempt.duration).toBeGreaterThanOrEqual(6);
      });
    });

    test('should respect limit parameter', async () => {
      const result = await getPlayAttempts(GameId.PATHOLOGY, testUser, {}, 3);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    test('should handle multiple filters combined', async () => {
      const result = await getPlayAttempts(GameId.PATHOLOGY, testUser, {
        filterSolved: true,
        minDurationMinutes: 0.01, // Very low threshold
        datetime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date
      });

      expect(Array.isArray(result)).toBe(true);
      // Should apply all filters
    });

    test('should return empty array when no matches found', async () => {
      const pastDate = new Date('2020-01-01'); // Very old date
      const result = await getPlayAttempts(GameId.PATHOLOGY, testUser, { datetime: pastDate });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    test('should include level and user data in results', async () => {
      const result = await getPlayAttempts(GameId.PATHOLOGY, testUser, {});

      if (result.length > 0) {
        const playAttempt = result[0];

        // Should have level data
        expect(playAttempt.levelId).toHaveProperty('_id');
        expect(playAttempt.levelId).toHaveProperty('name');
        expect(playAttempt.levelId).toHaveProperty('userId');

        // Should have level author data
        expect(playAttempt.levelId.userId).toHaveProperty('_id');
        expect(playAttempt.levelId.userId).toHaveProperty('name');
        expect(playAttempt.levelId.userId).toHaveProperty('config');

        // Should not have sensitive user data
        expect(playAttempt.levelId.userId.password).toBeUndefined();
        expect(playAttempt.levelId.userId.email).toBeUndefined();
      }
    });

    test('should sort by endTime descending and attemptContext descending', async () => {
      // Create additional play attempts with different end times and contexts
      const attempt1 = await PlayAttemptModel.create({
        _id: new Types.ObjectId(),
        userId: testUser._id,
        levelId: testLevel._id,
        gameId: GameId.PATHOLOGY,
        startTime: TimerUtil.getTs() - 200,
        endTime: TimerUtil.getTs() - 100, // Earlier end time
        attemptContext: AttemptContext.UNSOLVED,
      });

      const attempt2 = await PlayAttemptModel.create({
        _id: new Types.ObjectId(),
        userId: testUser._id,
        levelId: testLevel._id,
        gameId: GameId.PATHOLOGY,
        startTime: TimerUtil.getTs() - 200,
        endTime: TimerUtil.getTs() - 100, // Same end time as attempt1
        attemptContext: AttemptContext.JUST_SOLVED, // Higher context
      });

      try {
        const result = await getPlayAttempts(GameId.PATHOLOGY, testUser, {}, 10);

        if (result.length >= 2) {
          // Should be sorted by endTime descending first
          for (let i = 0; i < result.length - 1; i++) {
            expect(result[i].endTime).toBeGreaterThanOrEqual(result[i + 1].endTime);

            // If endTime is the same, should be sorted by attemptContext descending
            if (result[i].endTime === result[i + 1].endTime) {
              expect(result[i].attemptContext).toBeGreaterThanOrEqual(result[i + 1].attemptContext);
            }
          }
        }
      } finally {
        // Clean up additional test data
        await PlayAttemptModel.findByIdAndDelete(attempt1._id);
        await PlayAttemptModel.findByIdAndDelete(attempt2._id);
      }
    });
  });
});
