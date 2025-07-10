import AchievementType from '@root/constants/achievements/achievementType';
import AdminCommand from '@root/constants/adminCommand';
import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import Role from '@root/constants/role';
import TestId from '@root/constants/testId';
import { logger } from '@root/helpers/logger';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { AchievementModel, LevelModel, NotificationModel, UserModel } from '@root/models/mongoose';
import adminHandler from '@root/pages/api/admin/index';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

enableFetchMocks();

describe('api/admin', () => {
  // Mock logger to avoid console spam during tests
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

  describe('Authentication & Authorization', () => {
    test('should return 401 for non-admin user', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER) // Regular user, not admin
            },
            body: {
              command: AdminCommand.RefreshAchievements,
              targetId: TestId.USER,
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Not authorized');
          expect(res.status).toBe(401);
        },
      });
    });

    test('should return 401 for unauthenticated user', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            body: {
              command: AdminCommand.RefreshAchievements,
              targetId: TestId.USER,
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Unauthorized: No token provided');
          expect(res.status).toBe(401);
        },
      });
    });

    test('should return 400 for invalid command', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: 'invalidCommand',
              targetId: TestId.USER,
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Invalid body.command');
          expect(res.status).toBe(400);
        },
      });
    });

    test('should return 400 for invalid targetId', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.RefreshAchievements,
              targetId: 'invalidObjectId',
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Invalid body.targetId');
          expect(res.status).toBe(400);
        },
      });
    });
  });

  describe('User Commands', () => {
    test('should handle RefreshAchievements command', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.RefreshAchievements,
              targetId: TestId.USER,
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
        },
      });
    });

    test('should handle DeleteAchievements command', async () => {
      // Create some test achievements first
      await AchievementModel.create([
        {
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(TestId.USER),
          gameId: DEFAULT_GAME_ID,
          type: AchievementType.WELCOME,
        }
      ]);

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.DeleteAchievements,
              targetId: TestId.USER,
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);

          // Verify achievements were deleted
          const achievements = await AchievementModel.find({ userId: TestId.USER, gameId: DEFAULT_GAME_ID });

          expect(achievements).toHaveLength(0);
        },
      });
    });

    test('should handle DeleteUser command', async () => {
      // check that user and levels by the user exists
      const user = await UserModel.findById(TestId.USER_B);
      const levels = await LevelModel.countDocuments({ userId: TestId.USER_B });

      expect(user).toBeDefined();
      expect(levels).toBeGreaterThan(0);

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.DeleteUser,
              targetId: TestId.USER_B,
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);

          // Verify user was deleted
          const user = await UserModel.findById(TestId.USER_B);

          // verify levels from the user were deleted
          const levels = await LevelModel.find({ userId: TestId.USER_B });

          expect(levels).toHaveLength(0);

          // verify achievements from the user were deleted

          expect(user).toBeNull();

          // verify other users and levels are not affected
          const otherUsers = await UserModel.countDocuments();
          const otherLevels = await LevelModel.countDocuments();

          expect(otherUsers).toBeGreaterThan(0);
          expect(otherLevels).toBeGreaterThan(0);
        },
      });
    });
  });

  describe('Level Commands', () => {
    test('should handle RefreshIndexCalcs command', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.RefreshIndexCalcs,
              targetId: TestId.LEVEL,
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
        },
      });
    });

    test('should handle RefreshPlayAttempts command', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.RefreshPlayAttempts,
              targetId: TestId.LEVEL,
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
        },
      });
    });

    test('should handle SwitchIsRanked command', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.SwitchIsRanked,
              targetId: TestId.LEVEL,
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
        },
      });
    });

    test('should handle RegenImage command', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.RegenImage,
              targetId: TestId.LEVEL,
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
        },
      });
    });

    test('should return 500 for RegenImage with non-existent level', async () => {
      const nonExistentLevelId = new Types.ObjectId();

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.RegenImage,
              targetId: nonExistentLevelId.toString(),
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Level not found');
          expect(res.status).toBe(500);
        },
      });
    });
  });

  describe('System Commands', () => {
    test('should handle SendReloadPageToUsers command', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.SendReloadPageToUsers,
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
        },
      });
    });

    test('should handle RunBatchRefreshPlayAttempts command', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.RunBatchRefreshPlayAttempts,
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
        },
      });
    });

    test('should handle RunEmailDigest command', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.RunEmailDigest,
              payload: JSON.stringify({ limit: 10 }),
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
        },
      });
    });

    test('should handle SendAdminMessage command', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.SendAdminMessage,
              role: null, // Send to all users instead of specific role
              payload: JSON.stringify({
                message: 'Test admin message',
                href: '/test'
              }),
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
        },
      });
    });

    test('should handle SendAdminMessage command to all users', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.SendAdminMessage,
              role: null,
              payload: JSON.stringify({
                message: 'Test admin message to all users',
                href: '/announcement'
              }),
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
        },
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Mock UserModel.aggregate to throw an error
      const originalAggregate = UserModel.aggregate;

      jest.spyOn(UserModel, 'aggregate').mockRejectedValueOnce(new Error('Database connection failed'));

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.SendAdminMessage,
              role: null, // Send to all users
              payload: JSON.stringify({
                message: 'Test message',
                href: '/test'
              }),
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Error sending admin message');
          expect(res.status).toBe(500);
        },
      });

      // Restore original method
      UserModel.aggregate = originalAggregate;
    });

    test('should handle SwitchIsRanked errors', async () => {
      // Mock LevelModel.findById to return null
      const originalFindById = LevelModel.findById;

      jest.spyOn(LevelModel, 'findById').mockResolvedValueOnce(null);

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.SwitchIsRanked,
              targetId: TestId.LEVEL,
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Error switching isRanked');
          expect(res.status).toBe(500);
        },
      });

      // Restore original method
      LevelModel.findById = originalFindById;
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing optional fields', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.SendReloadPageToUsers,
              // No targetId, role, or payload - should still work
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeUndefined();
          expect(response.success).toBe(true);
          expect(res.status).toBe(200);
        },
      });
    });

    test('should handle empty request body', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {},
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Invalid body.command');
          expect(res.status).toBe(400);
        },
      });
    });

    test('should handle malformed JSON payload', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              command: AdminCommand.RunEmailDigest,
              payload: 'invalid json string', // Invalid JSON
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await adminHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBeDefined();
          expect(res.status).toBe(500);
        },
      });
    });
  });
});
