import { DIFFICULTY_INDEX } from '@root/components/formatted/formattedDifficulty';
import { skillRequirements } from '@root/constants/achievements/AchievementRulesSkill';
import AchievementType from '@root/constants/achievements/achievementType';
import { DEFAULT_GAME_ID, GameId } from '@root/constants/GameId';
import { genTestLevel, genTestUser } from '@root/lib/initializeLocalDb';
import User from '@root/models/db/user';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../constants/testId';
import { logger } from '../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { AchievementModel, LevelModel, StatModel, UserConfigModel, UserModel } from '../../../models/mongoose';
import handler from '../../../pages/api/player-rank-stats';
import { createAnotherGameConfig } from './helper';

let USER: User;
let USER_B: User;

beforeAll(async () => {
  await dbConnect({ ignoreInitializeLocalDb: true });

  // Setup test users and levels
  await Promise.all([
    LevelModel.insertMany([
      genTestLevel({
        _id: new Types.ObjectId(TestId.LEVEL),
        userId: new Types.ObjectId(TestId.USER) as never,
        calc_difficulty_estimate: 0, // Kindergarten difficulty
      }),
      genTestLevel({
        _id: new Types.ObjectId(TestId.LEVEL_2),
        userId: new Types.ObjectId(TestId.USER) as never,
        calc_difficulty_estimate: 45, // Elementary difficulty
      }),
      genTestLevel({
        _id: new Types.ObjectId(TestId.LEVEL_3),
        userId: new Types.ObjectId(TestId.USER) as never,
        calc_difficulty_estimate: 6000, // Professor difficulty
      }),
    ]),
    UserModel.insertMany([
      await genTestUser({
        _id: new Types.ObjectId(TestId.USER),
      }),
      await genTestUser({
        _id: new Types.ObjectId(TestId.USER_B),
      }),
    ], { validateBeforeSave: true } as never),
  ]);

  await Promise.all([
    createAnotherGameConfig(TestId.USER, DEFAULT_GAME_ID),
    createAnotherGameConfig(TestId.USER_B, DEFAULT_GAME_ID),
  ]);

  // Update user configs to have calcLevelsCompletedCount > 0 so they count as active users
  await Promise.all([
    UserConfigModel.updateOne(
      { userId: new Types.ObjectId(TestId.USER), gameId: DEFAULT_GAME_ID },
      { $set: { calcLevelsCompletedCount: 1 } }
    ),
    UserConfigModel.updateOne(
      { userId: new Types.ObjectId(TestId.USER_B), gameId: DEFAULT_GAME_ID },
      { $set: { calcLevelsCompletedCount: 1 } }
    ),
  ]);

  [USER, USER_B] = await Promise.all([
    UserModel.findById(TestId.USER),
    UserModel.findById(TestId.USER_B)
  ]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await dbDisconnect();
});

enableFetchMocks();

describe('Testing player-rank-stats api', () => {
  test('GET without authentication should return 401', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {},
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(401);
        expect(response.error).toBe('Not authenticated');
      },
    });
  });

  test('GET with invalid token should return 401', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: 'invalid-token',
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

        expect(res.status).toBe(401);
        expect(response.error).toBe('Invalid user');
      },
    });
  });

  test('POST method should return 405', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(res.status).toBe(405);
        expect(response.error).toBe('Method not allowed');
      },
    });
  });

  test('GET with valid token and no achievements should return newb status', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(res.status).toBe(200);
        expect(response.skillAchievements).toBeDefined();
        expect(response.totalActiveUsers).toBeDefined();
        expect(Array.isArray(response.skillAchievements)).toBe(true);
        expect(response.skillAchievements.length).toBe(skillRequirements.length);

        // Check that all achievements are locked with 0 progress
        response.skillAchievements.forEach((achievement: any) => {
          expect(achievement.isUnlocked).toBe(false);
          expect(achievement.userProgress).toBe(0);
          expect(achievement.achievementType).toBeDefined();
          expect(achievement.difficultyIndex).toBeDefined();
          expect(achievement.requirement).toBeDefined();
          expect(achievement.count).toBeDefined();
          expect(achievement.percentile).toBeDefined();
        });
      },
    });
  });

  test('GET after solving levels should show correct progress', async () => {
    // Create some stats for the user to show progress
    await StatModel.insertMany([
      {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(TestId.USER),
        levelId: new Types.ObjectId(TestId.LEVEL),
        gameId: DEFAULT_GAME_ID,
        moves: 10,
        attempts: 1,
        complete: true,
        ts: Date.now(),
      },
      {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(TestId.USER),
        levelId: new Types.ObjectId(TestId.LEVEL_2),
        gameId: DEFAULT_GAME_ID,
        moves: 15,
        attempts: 1,
        complete: true,
        ts: Date.now(),
      },
    ]);

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(res.status).toBe(200);
        expect(response.skillAchievements).toBeDefined();

        // Find Kindergarten achievement (should show progress)
        const kindergartenAchievement = response.skillAchievements.find(
          (ach: any) => ach.difficultyIndex === DIFFICULTY_INDEX.KINDERGARTEN
        );

        expect(kindergartenAchievement).toBeDefined();
        expect(kindergartenAchievement.userProgress).toBe(2); // 2 levels solved (rolling sum includes elementary)

        // Find Elementary achievement (should show progress)
        const elementaryAchievement = response.skillAchievements.find(
          (ach: any) => ach.difficultyIndex === DIFFICULTY_INDEX.ELEMENTARY
        );

        expect(elementaryAchievement).toBeDefined();
        expect(elementaryAchievement.userProgress).toBe(1); // 1 elementary level solved
      },
    });
  });

  test('GET after unlocking achievements should show correct status', async () => {
    // Create achievements for the user
    await AchievementModel.insertMany([
      {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(TestId.USER),
        type: AchievementType.PLAYER_RANK_KINDERGARTEN,
        gameId: DEFAULT_GAME_ID,
      },
    ]);

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(res.status).toBe(200);

        // Find Kindergarten achievement (should be unlocked)
        const kindergartenAchievement = response.skillAchievements.find(
          (ach: any) => ach.difficultyIndex === DIFFICULTY_INDEX.KINDERGARTEN
        );

        expect(kindergartenAchievement).toBeDefined();
        expect(kindergartenAchievement.isUnlocked).toBe(true);

        // Find Elementary achievement (should still be locked)
        const elementaryAchievement = response.skillAchievements.find(
          (ach: any) => ach.difficultyIndex === DIFFICULTY_INDEX.ELEMENTARY
        );

        expect(elementaryAchievement).toBeDefined();
        expect(elementaryAchievement.isUnlocked).toBe(false);
      },
    });
  });

  test('GET should include achievement statistics and percentiles', async () => {
    // Create achievements for other users to test statistics
    await AchievementModel.insertMany([
      {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(TestId.USER_B),
        type: AchievementType.PLAYER_RANK_KINDERGARTEN,
        gameId: DEFAULT_GAME_ID,
      },
    ]);

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(res.status).toBe(200);
        expect(response.totalActiveUsers).toBeGreaterThanOrEqual(0);

        // Find Kindergarten achievement (should have statistics)
        const kindergartenAchievement = response.skillAchievements.find(
          (ach: any) => ach.difficultyIndex === DIFFICULTY_INDEX.KINDERGARTEN
        );

        expect(kindergartenAchievement).toBeDefined();
        expect(kindergartenAchievement.count).toBeGreaterThan(0); // At least 2 users have this achievement
        expect(kindergartenAchievement.percentile).toBeGreaterThanOrEqual(0);
      },
    });
  });

  test('GET should handle database errors gracefully', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    // Mock the aggregation call to throw an error
    jest.spyOn(AchievementModel, 'aggregate').mockRejectedValueOnce(new Error('Database error'));

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(res.status).toBe(500);
        expect(response.error).toBe('Internal server error');
      },
    });
  });

  test('GET should work with different game IDs', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          headers: {
            'content-type': 'application/json',
            'host': 'sokopath.thinky.gg'
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.skillAchievements).toBeDefined();
        expect(Array.isArray(response.skillAchievements)).toBe(true);
        // Should return the same structure but for a different game
        expect(response.skillAchievements.length).toBe(skillRequirements.length);
      },
    });
  });

  test('GET should return achievements in correct difficulty order', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
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

        expect(res.status).toBe(200);

        // Verify achievements are in the same order as skillRequirements
        expect(response.skillAchievements.length).toBe(skillRequirements.length);

        response.skillAchievements.forEach((achievement: any, index: number) => {
          expect(achievement.achievementType).toBe(skillRequirements[index].achievementType);
          expect(achievement.difficultyIndex).toBe(skillRequirements[index].difficultyIndex);
          expect(achievement.requirement).toBe(skillRequirements[index].levels);
        });
      },
    });
  });
});
