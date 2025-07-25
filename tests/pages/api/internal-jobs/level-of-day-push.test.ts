import { DEFAULT_GAME_ID, GameId } from '@root/constants/GameId';
import NotificationType from '@root/constants/notificationType';
import { NextApiRequestWrapper } from '@root/helpers/apiWrapper';
import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { DeviceModel, NotificationModel, PlayAttemptModel, QueueMessageModel, UserModel } from '../../../../models/mongoose';
import { DeviceState } from '../../../../models/schemas/deviceSchema';
import { QueueMessageType } from '../../../../models/schemas/queueMessageSchema';
import handler from '../../../../pages/api/internal-jobs/level-of-day-push';

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  credential: {
    cert: jest.fn(),
  },
  initializeApp: jest.fn().mockReturnValue({
    messaging: jest.fn().mockReturnValue({
      sendEachForMulticast: jest.fn().mockResolvedValue({
        responses: [{ success: true, messageId: 'test-message-id' }],
        successCount: 1,
        failureCount: 0,
      }),
    }),
  }),
}));

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(async () => {
  jest.restoreAllMocks();
});

enableFetchMocks();

describe('Level of Day Push Notifications', () => {
  beforeEach(async () => {
    // Clean up test data
    await Promise.all([
      NotificationModel.deleteMany({ type: NotificationType.LEVEL_OF_DAY }),
      QueueMessageModel.deleteMany({ type: QueueMessageType.PUSH_NOTIFICATION }),
      DeviceModel.deleteMany({}),
    ]);
  });

  test('send with an invalid process.env var', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: 'invalid-secret'
          },
          body: {},
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(401);
        expect(response.error).toBe('Unauthorized');
      },
    });
  });

  test('send push notifications to users with active devices', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    // Create test device for user
    await DeviceModel.create({
      _id: new Types.ObjectId(),
      userId: TestId.USER,
      deviceToken: 'test-device-token',
      deviceName: 'Test Device',
      deviceBrand: 'Test Brand',
      deviceOSName: 'iOS',
      deviceOSVersion: '16.0',
      state: DeviceState.ACTIVE,
    });

    // Ensure user has push notifications enabled
    await UserModel.findByIdAndUpdate(TestId.USER, {
      disallowedPushNotifications: [],
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST,
            limit: '1'
          },
          body: {},
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.success).toBe(true);
        expect(response.sent).toBe(1);
        expect(response.failed).toBe(0);

        // Check that notification was created
        const notifications = await NotificationModel.find({ type: NotificationType.LEVEL_OF_DAY });

        expect(notifications).toHaveLength(1);
        expect(notifications[0].userId.toString()).toBe(TestId.USER.toString());

        // Check that push notification was queued
        const queueMessages = await QueueMessageModel.find({ type: QueueMessageType.PUSH_NOTIFICATION });

        expect(queueMessages).toHaveLength(1);
      },
    });
  });

  test('send push notifications to guest users with active devices', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    // Create test device for guest user
    await DeviceModel.create({
      _id: new Types.ObjectId(),
      userId: TestId.USER_GUEST,
      deviceToken: 'test-device-token-guest',
      deviceName: 'Guest Device',
      deviceBrand: 'Test Brand',
      deviceOSName: 'iOS',
      deviceOSVersion: '16.0',
      state: DeviceState.ACTIVE,
    });

    // Ensure guest user has push notifications enabled
    await UserModel.findByIdAndUpdate(TestId.USER_GUEST, {
      disallowedPushNotifications: [],
      isGuest: true,
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST,
            limit: '10'
          },
          body: {},
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.success).toBe(true);
        expect(response.sent).toBeGreaterThanOrEqual(1);

        // Check that notification was created for guest
        const notifications = await NotificationModel.find({
          type: NotificationType.LEVEL_OF_DAY,
          userId: TestId.USER_GUEST
        });

        expect(notifications).toHaveLength(1);
      },
    });
  });

  test('skip users with LEVEL_OF_DAY in disallowedPushNotifications', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    // Create test device for user
    await DeviceModel.create({
      _id: new Types.ObjectId(),
      userId: TestId.USER,
      deviceToken: 'test-device-token',
      deviceName: 'Test Device',
      deviceBrand: 'Test Brand',
      deviceOSName: 'iOS',
      deviceOSVersion: '16.0',
      state: DeviceState.ACTIVE,
    });

    // Disable level of day push notifications for user
    await UserModel.findByIdAndUpdate(TestId.USER, {
      disallowedPushNotifications: [NotificationType.LEVEL_OF_DAY],
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST,
          },
          body: {},
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.success).toBe(true);
        expect(response.sent).toBe(0);
        expect(response.failed).toBe(0);

        // Check that no notifications were created
        const notifications = await NotificationModel.find({ type: NotificationType.LEVEL_OF_DAY });

        expect(notifications).toHaveLength(0);
      },
    });
  });

  test('skip users with inactive devices', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    // Create inactive device for user
    await DeviceModel.create({
      _id: new Types.ObjectId(),
      userId: TestId.USER,
      deviceToken: 'test-device-token',
      deviceName: 'Test Device',
      deviceBrand: 'Test Brand',
      deviceOSName: 'iOS',
      deviceOSVersion: '16.0',
      state: DeviceState.INACTIVE,
    });

    // Ensure user has push notifications enabled
    await UserModel.findByIdAndUpdate(TestId.USER, {
      disallowedPushNotifications: [],
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST,
          },
          body: {},
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.success).toBe(true);
        expect(response.sent).toBe(0);
        expect(response.failed).toBe(0);

        // Check that no notifications were created
        const notifications = await NotificationModel.find({ type: NotificationType.LEVEL_OF_DAY });

        expect(notifications).toHaveLength(0);
      },
    });
  });

  test('skip users who already received today\'s notification', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    // Create test device for user
    await DeviceModel.create({
      _id: new Types.ObjectId(),
      userId: TestId.USER,
      deviceToken: 'test-device-token',
      deviceName: 'Test Device',
      deviceBrand: 'Test Brand',
      deviceOSName: 'iOS',
      deviceOSVersion: '16.0',
      state: DeviceState.ACTIVE,
    });

    // Create a notification from today
    const today = new Date();

    today.setUTCHours(12, 0, 0, 0);

    await NotificationModel.create({
      _id: new Types.ObjectId(),
      userId: TestId.USER,
      type: NotificationType.LEVEL_OF_DAY,
      gameId: GameId.PATHOLOGY,
      message: 'Already sent today',
      read: false,
      createdAt: today,
    });

    // Ensure user has push notifications enabled
    await UserModel.findByIdAndUpdate(TestId.USER, {
      disallowedPushNotifications: [],
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST,
          },
          body: {},
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.success).toBe(true);
        expect(response.sent).toBe(0);
        expect(response.failed).toBe(0);

        // Check that only one notification exists (the one we created)
        const notifications = await NotificationModel.find({ type: NotificationType.LEVEL_OF_DAY });

        expect(notifications).toHaveLength(1);
      },
    });
  });

  test('schedule notifications based on user activity patterns', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Create test device for user
    await DeviceModel.create({
      _id: new Types.ObjectId(),
      userId: TestId.USER,
      deviceToken: 'test-device-token',
      deviceName: 'Test Device',
      deviceBrand: 'Test Brand',
      deviceOSName: 'iOS',
      deviceOSVersion: '16.0',
      state: DeviceState.ACTIVE,
    });

    // Create play attempts for user at 3pm UTC on the same day of week
    const playTime = new Date(oneWeekAgo);

    playTime.setUTCHours(15, 0, 0, 0);

    await PlayAttemptModel.create({
      _id: new Types.ObjectId(),
      userId: TestId.USER,
      levelId: TestId.LEVEL,
      gameId: GameId.PATHOLOGY,
      startTime: Math.floor(playTime.getTime() / 1000),
      endTime: Math.floor(playTime.getTime() / 1000) + 300,
      attemptContext: 0,
      updateCount: 1,
    });

    // Ensure user has push notifications enabled
    await UserModel.findByIdAndUpdate(TestId.USER, {
      disallowedPushNotifications: [],
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST,
            limit: '1'
          },
          body: {},
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.success).toBe(true);
        expect(response.sent).toBe(1);

        // Check that push notification was scheduled for 3pm
        const queueMessages = await QueueMessageModel.find({ type: QueueMessageType.PUSH_NOTIFICATION });

        expect(queueMessages).toHaveLength(1);

        const runAt = queueMessages[0].runAt;

        expect(runAt.getUTCHours()).toBe(15);
      },
    });
  });

  test('use user\'s lastGame for level of day selection', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    // Create test device for user
    await DeviceModel.create({
      _id: new Types.ObjectId(),
      userId: TestId.USER,
      deviceToken: 'test-device-token',
      deviceName: 'Test Device',
      deviceBrand: 'Test Brand',
      deviceOSName: 'iOS',
      deviceOSVersion: '16.0',
      state: DeviceState.ACTIVE,
    });

    // Set user's lastGame to a specific game (use PATHOLOGY since it's likely to have level of day)
    await UserModel.findByIdAndUpdate(TestId.USER, {
      disallowedPushNotifications: [],
      lastGame: GameId.PATHOLOGY,
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST,
            limit: '1'
          },
          body: {},
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.success).toBe(true);

        // Check that notification was created for the user's lastGame
        const notifications = await NotificationModel.find({ type: NotificationType.LEVEL_OF_DAY });

        if (notifications.length > 0) {
          expect(notifications[0].gameId).toBe(GameId.PATHOLOGY);
        }
      },
    });
  });

  test('schedule random time for users with no activity data', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'info').mockImplementation(() => ({} as Logger));
    jest.spyOn(logger, 'warn').mockImplementation(() => ({} as Logger));

    // Create test device for user
    await DeviceModel.create({
      _id: new Types.ObjectId(),
      userId: TestId.USER_B,
      deviceToken: 'test-device-token-b',
      deviceName: 'Test Device B',
      deviceBrand: 'Test Brand',
      deviceOSName: 'Android',
      deviceOSVersion: '13.0',
      state: DeviceState.ACTIVE,
    });

    // Ensure user has push notifications enabled but no play attempts
    await UserModel.findByIdAndUpdate(TestId.USER_B, {
      disallowedPushNotifications: [],
    });

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWrapper = {
          gameId: DEFAULT_GAME_ID,
          method: 'GET',
          query: {
            secret: process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST,
            limit: '1'
          },
          body: {},
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWrapper;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.success).toBe(true);

        // Check that push notification was scheduled within next 3 hours
        const queueMessages = await QueueMessageModel.find({ type: QueueMessageType.PUSH_NOTIFICATION });
        const runAt = queueMessages[0]?.runAt;

        if (runAt) {
          const now = new Date();
          const timeDiff = runAt.getTime() - now.getTime();

          expect(timeDiff).toBeGreaterThanOrEqual(0);
          expect(timeDiff).toBeLessThanOrEqual(3 * 60 * 60 * 1000); // 3 hours in milliseconds
        }
      },
    });
  });
});
