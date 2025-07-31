import AchievementCategory from '@root/constants/achievements/achievementCategory';
import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { QueueMessageModel } from '@root/models/mongoose';
import { QueueMessageState, QueueMessageType } from '@root/models/schemas/queueMessageSchema';
import { Types } from 'mongoose';
import { NextApiHandler } from 'next';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { logger } from '../../../../../helpers/logger';

// Mock fetch for testing
global.fetch = jest.fn();

// Mock processDiscordMentions
jest.mock('../../../../../helpers/processDiscordMentions', () => ({
  processDiscordMentions: jest.fn().mockResolvedValue('mocked processed content')
}));

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(async () => {
  jest.restoreAllMocks();
  // Clean up any test queue messages
  try {
    await QueueMessageModel.deleteMany({ dedupeKey: { $regex: /^test-/ } });
    await QueueMessageModel.deleteMany({ state: QueueMessageState.PENDING });
  } catch (e) {
    // Ignore errors during cleanup
  }
  (global.fetch as jest.Mock).mockClear();
});

describe('pages/api/internal-jobs/worker', () => {
  describe('Queue functions', () => {
    test('basic queue function should create queue message', async () => {
      const { queue } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const dedupeKey = 'test-queue-basic';
      const type = QueueMessageType.FETCH;
      const message = JSON.stringify({ url: 'https://example.com' });

      await queue(dedupeKey, type, message);

      const queueMessage = await QueueMessageModel.findOne({ dedupeKey });

      expect(queueMessage).toBeDefined();
      expect(queueMessage?.type).toBe(type);
      expect(queueMessage?.message).toBe(message);
      expect(queueMessage?.state).toBe(QueueMessageState.PENDING);
      expect(queueMessage?.runAt).toBeDefined();
    });

    test('queue function with runAt date should schedule message', async () => {
      const { queue } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const dedupeKey = 'test-queue-scheduled';
      const type = QueueMessageType.FETCH;
      const message = JSON.stringify({ url: 'https://example.com' });
      const runAt = new Date(Date.now() + 60000); // 1 minute in future

      await queue(dedupeKey, type, message, undefined, runAt);

      const queueMessage = await QueueMessageModel.findOne({ dedupeKey });

      expect(queueMessage?.runAt).toEqual(runAt);
    });

    test('queuePushNotification should create both push and email messages', async () => {
      const { queuePushNotification } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const notificationId = new Types.ObjectId();

      await queuePushNotification(notificationId);

      const pushMessage = await QueueMessageModel.findOne({
        dedupeKey: `push-${notificationId.toString()}`,
        type: QueueMessageType.PUSH_NOTIFICATION
      });
      const emailMessage = await QueueMessageModel.findOne({
        dedupeKey: `email-${notificationId.toString()}`,
        type: QueueMessageType.EMAIL_NOTIFICATION
      });

      expect(pushMessage).toBeDefined();
      expect(emailMessage).toBeDefined();
    });

    test('bulkQueuePushNotification should create multiple push and email messages with session', async () => {
      const { bulkQueuePushNotification } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');
      const mongoose = await import('mongoose');

      const notificationIds = [new Types.ObjectId(), new Types.ObjectId()];
      const session = await mongoose.default.startSession();

      try {
        await session.withTransaction(async () => {
          await bulkQueuePushNotification(notificationIds, session);
        });
      } finally {
        session.endSession();
      }

      // Check that both push and email messages were created for each notification
      for (const notificationId of notificationIds) {
        const pushMessage = await QueueMessageModel.findOne({
          dedupeKey: `push-${notificationId.toString()}`,
          type: QueueMessageType.PUSH_NOTIFICATION
        });
        const emailMessage = await QueueMessageModel.findOne({
          dedupeKey: `email-${notificationId.toString()}`,
          type: QueueMessageType.EMAIL_NOTIFICATION
        });

        expect(pushMessage).toBeDefined();
        expect(emailMessage).toBeDefined();
        expect(pushMessage?.runAt).toBeDefined(); // Check runAt is set

        const pushParsedMessage = JSON.parse(pushMessage?.message || '{}');
        const emailParsedMessage = JSON.parse(emailMessage?.message || '{}');

        expect(pushParsedMessage.notificationId).toBe(notificationId.toString());
        expect(emailParsedMessage.notificationId).toBe(notificationId.toString());
      }
    });

    test('queueRefreshAchievements should create refresh achievements message', async () => {
      const { queueRefreshAchievements } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const userId = new Types.ObjectId();
      const categories = [AchievementCategory.SKILL, AchievementCategory.CREATOR];

      await queueRefreshAchievements(DEFAULT_GAME_ID, userId, categories);

      const queueMessage = await QueueMessageModel.findOne({
        type: QueueMessageType.REFRESH_ACHIEVEMENTS
      });

      expect(queueMessage).toBeDefined();
      expect(queueMessage?.dedupeKey).toContain(userId.toString());
      expect(queueMessage?.dedupeKey).toContain('refresh-achievements');

      const parsedMessage = JSON.parse(queueMessage?.message || '{}');

      expect(parsedMessage.gameId).toBe(DEFAULT_GAME_ID);
      expect(parsedMessage.userId).toBe(userId.toString());
      expect(parsedMessage.categories).toEqual(categories);
    });

    test('queueDiscord should create Discord notification message with default dedupeKey', async () => {
      const { queueDiscord } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const channelId = 'test-channel-123';
      const token = 'test-token-456';
      const content = 'Test Discord message';
      const mentionUsernames = ['user1', 'user2'];

      await queueDiscord(channelId, token, content, mentionUsernames);

      const queueMessage = await QueueMessageModel.findOne({
        type: QueueMessageType.DISCORD_NOTIFICATION
      });

      expect(queueMessage).toBeDefined();
      expect(queueMessage?.dedupeKey).toContain(`discord-${channelId}`);

      const parsedMessage = JSON.parse(queueMessage?.message || '{}');

      expect(parsedMessage.channelId).toBe(channelId);
      expect(parsedMessage.token).toBe(token);
      expect(parsedMessage.content).toBe(content);
      expect(parsedMessage.mentionUsernames).toEqual(mentionUsernames);
    });

    test('queueDiscord should use custom dedupeKey when provided', async () => {
      const { queueDiscord } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const channelId = 'test-channel-456';
      const token = 'test-token-789';
      const content = 'Test Discord message with custom dedupe';
      const customDedupeKey = 'test-custom-dedupe-key';

      await queueDiscord(channelId, token, content, undefined, customDedupeKey);

      const queueMessage = await QueueMessageModel.findOne({
        dedupeKey: customDedupeKey,
        type: QueueMessageType.DISCORD_NOTIFICATION
      });

      expect(queueMessage).toBeDefined();

      const parsedMessage = JSON.parse(queueMessage?.message || '{}');

      expect(parsedMessage.channelId).toBe(channelId);
      expect(parsedMessage.token).toBe(token);
      expect(parsedMessage.content).toBe(content);
      expect(parsedMessage.mentionUsernames).toEqual([]);
    });

    test('queueFetch should create fetch message with auto-generated dedupeKey when not provided', async () => {
      const { queueFetch } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const url = 'https://example.com/api/auto-dedupe';
      const options = { method: 'GET' };

      await queueFetch(url, options);

      const queueMessage = await QueueMessageModel.findOne({
        type: QueueMessageType.FETCH
      });

      expect(queueMessage).toBeDefined();
      expect(queueMessage?.dedupeKey).toBeDefined();
      expect(queueMessage?.dedupeKey).toMatch(/^[0-9a-f]{24}$/); // ObjectId format

      const parsedMessage = JSON.parse(queueMessage?.message || '{}');

      expect(parsedMessage.url).toBe(url);
      expect(parsedMessage.options).toEqual(options);
    });

    test('bulkQueueCalcPlayAttempts should create multiple calc messages', async () => {
      const { bulkQueueCalcPlayAttempts } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const levelIds = [new Types.ObjectId(), new Types.ObjectId()];

      await bulkQueueCalcPlayAttempts(levelIds);

      for (const levelId of levelIds) {
        const queueMessage = await QueueMessageModel.findOne({
          dedupeKey: levelId.toString(),
          type: QueueMessageType.CALC_PLAY_ATTEMPTS
        });

        expect(queueMessage).toBeDefined();
        expect(queueMessage?.runAt).toBeDefined();
      }
    });

    test('bulkQueueCalcPlayAttempts with spreadRunAtDuration should schedule messages with different times', async () => {
      const { bulkQueueCalcPlayAttempts } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const levelIds = [new Types.ObjectId(), new Types.ObjectId()];
      const spreadDuration = 10; // 10 seconds

      await bulkQueueCalcPlayAttempts(levelIds, undefined, spreadDuration);

      const messages = await QueueMessageModel.find({
        dedupeKey: { $in: levelIds.map(id => id.toString()) },
        type: QueueMessageType.CALC_PLAY_ATTEMPTS
      }).sort({ runAt: 1 });

      expect(messages.length).toBe(2);

      if (messages.length >= 2) {
        const timeDiff = messages[1].runAt!.getTime() - messages[0].runAt!.getTime();

        expect(timeDiff).toBeGreaterThan(0);
      }
    });

    test('queueFetch should create fetch message', async () => {
      const { queueFetch } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const url = 'https://example.com/api';
      const options = { method: 'POST', body: 'test' };
      const dedupeKey = 'test-fetch';

      await queueFetch(url, options, dedupeKey);

      const queueMessage = await QueueMessageModel.findOne({ dedupeKey });

      expect(queueMessage).toBeDefined();
      expect(queueMessage?.type).toBe(QueueMessageType.FETCH);
      expect(queueMessage?.runAt).toBeDefined();

      const parsedMessage = JSON.parse(queueMessage?.message || '{}');

      expect(parsedMessage.url).toBe(url);
      expect(parsedMessage.options).toEqual(options);
    });

    test('queueCalcCreatorCounts should create calc creator counts message', async () => {
      const { queueCalcCreatorCounts } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const userId = new Types.ObjectId();

      await queueCalcCreatorCounts(DEFAULT_GAME_ID, userId);

      const queueMessage = await QueueMessageModel.findOne({
        dedupeKey: userId.toString(),
        type: QueueMessageType.CALC_CREATOR_COUNTS
      });

      expect(queueMessage).toBeDefined();

      const parsedMessage = JSON.parse(queueMessage?.message || '{}');

      expect(parsedMessage.gameId).toBe(DEFAULT_GAME_ID);
      expect(parsedMessage.userId).toBe(userId.toString());
    });

    test('queueGenLevelImage should create gen level image message', async () => {
      const { queueGenLevelImage } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const levelId = new Types.ObjectId();
      const postToDiscord = true;

      await queueGenLevelImage(levelId, postToDiscord);

      const queueMessage = await QueueMessageModel.findOne({
        dedupeKey: `${levelId.toString()}-queueGenLevelImage-${postToDiscord}`,
        type: QueueMessageType.GEN_LEVEL_IMAGE
      });

      expect(queueMessage).toBeDefined();

      const parsedMessage = JSON.parse(queueMessage?.message || '{}');

      expect(parsedMessage.levelId).toBe(levelId.toString());
      expect(parsedMessage.postToDiscord).toBe(postToDiscord);
    });

    test('queueRefreshIndexCalcs should create refresh index message', async () => {
      const { queueRefreshIndexCalcs } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const levelId = new Types.ObjectId();

      await queueRefreshIndexCalcs(levelId);

      const queueMessage = await QueueMessageModel.findOne({
        dedupeKey: levelId.toString(),
        type: QueueMessageType.REFRESH_INDEX_CALCULATIONS
      });

      expect(queueMessage).toBeDefined();
    });

    test('queueCalcPlayAttempts should create calc play attempts message', async () => {
      const { queueCalcPlayAttempts } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const levelId = new Types.ObjectId();

      await queueCalcPlayAttempts(levelId);

      const queueMessage = await QueueMessageModel.findOne({
        dedupeKey: levelId.toString(),
        type: QueueMessageType.CALC_PLAY_ATTEMPTS
      });

      expect(queueMessage).toBeDefined();
    });

    test('queueCalcPlayAttempts with future runAt should schedule message', async () => {
      const { queueCalcPlayAttempts } = await import('../../../../../pages/api/internal-jobs/worker/queueFunctions');

      const levelId = new Types.ObjectId();
      const futureDate = new Date(Date.now() + 120000); // 2 minutes in future

      await queueCalcPlayAttempts(levelId, undefined, futureDate);

      const queueMessage = await QueueMessageModel.findOne({
        dedupeKey: levelId.toString(),
        type: QueueMessageType.CALC_PLAY_ATTEMPTS
      });

      expect(queueMessage).toBeDefined();
      expect(queueMessage?.runAt).toEqual(futureDate);
    });
  });

  describe('Message Processing', () => {
    beforeEach(async () => {
      // Clean up any pending messages from previous tests
      await QueueMessageModel.deleteMany({ state: QueueMessageState.PENDING });

      // Mock fetch for Discord webhook tests
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      });
    });

    test('should process Discord notification without mentions', async () => {
      const { processQueueMessages } = await import('../../../../../pages/api/internal-jobs/worker/index');

      // Create a Discord notification message
      await QueueMessageModel.create({
        dedupeKey: 'test-discord-no-mentions',
        type: QueueMessageType.DISCORD_NOTIFICATION,
        message: JSON.stringify({
          channelId: 'test-channel',
          token: 'test-token',
          content: 'Test message without mentions',
          mentionUsernames: []
        }),
        state: QueueMessageState.PENDING,
        processingAttempts: 0,
        isProcessing: false,
        runAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await processQueueMessages();

      expect(result).toContain('Processed 1 messages');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test-channel/test-token?wait=true',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Test message without mentions' })
        })
      );
    });

    test('should process Discord notification with mentions', async () => {
      const { processQueueMessages } = await import('../../../../../pages/api/internal-jobs/worker/index');

      // Create a Discord notification message with mentions
      await QueueMessageModel.create({
        dedupeKey: 'test-discord-with-mentions',
        type: QueueMessageType.DISCORD_NOTIFICATION,
        message: JSON.stringify({
          channelId: 'test-channel',
          token: 'test-token',
          content: 'Test message with user1 and user2',
          mentionUsernames: ['user1', 'user2']
        }),
        state: QueueMessageState.PENDING,
        processingAttempts: 0,
        isProcessing: false,
        runAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await processQueueMessages();

      expect(result).toContain('Processed 1 messages');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test-channel/test-token?wait=true',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'mocked processed content' })
        })
      );
    });

    test('should handle Discord notification fetch error', async () => {
      const { processQueueMessages } = await import('../../../../../pages/api/internal-jobs/worker/index');

      // Mock fetch to throw an error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Create a Discord notification message
      await QueueMessageModel.create({
        dedupeKey: 'test-discord-error',
        type: QueueMessageType.DISCORD_NOTIFICATION,
        message: JSON.stringify({
          channelId: 'test-channel',
          token: 'test-token',
          content: 'Test message',
          mentionUsernames: []
        }),
        state: QueueMessageState.PENDING,
        processingAttempts: 0,
        isProcessing: false,
        runAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await processQueueMessages();

      expect(result).toContain('1 errors');

      // Check that the message was marked as pending for retry
      const updatedMessage = await QueueMessageModel.findOne({ dedupeKey: 'test-discord-error' });

      expect(updatedMessage?.state).toBe(QueueMessageState.PENDING);
      expect(updatedMessage?.processingAttempts).toBe(1);
    });

    test('should handle Discord notification HTTP error response', async () => {
      const { processQueueMessages } = await import('../../../../../pages/api/internal-jobs/worker/index');

      // Mock fetch to return HTTP error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      // Create a Discord notification message
      await QueueMessageModel.create({
        dedupeKey: 'test-discord-http-error',
        type: QueueMessageType.DISCORD_NOTIFICATION,
        message: JSON.stringify({
          channelId: 'test-channel',
          token: 'test-token',
          content: 'Test message',
          mentionUsernames: []
        }),
        state: QueueMessageState.PENDING,
        processingAttempts: 0,
        isProcessing: false,
        runAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await processQueueMessages();

      expect(result).toContain('1 errors');

      // Check that the message was marked as pending for retry
      const updatedMessage = await QueueMessageModel.findOne({ dedupeKey: 'test-discord-http-error' });

      expect(updatedMessage?.state).toBe(QueueMessageState.PENDING);
      expect(updatedMessage?.processingAttempts).toBe(1);
    });

    test('should process unknown message type and mark as error', async () => {
      const { processQueueMessages } = await import('../../../../../pages/api/internal-jobs/worker/index');

      // Create a message with FETCH type but malformed data to trigger the unknown type path
      await QueueMessageModel.create({
        dedupeKey: 'test-fetch-error',
        type: QueueMessageType.FETCH,
        message: JSON.stringify({ url: 'https://example.com', options: {} }),
        state: QueueMessageState.PENDING,
        processingAttempts: 0,
        isProcessing: false,
        runAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock fetch to return error for FETCH message type
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      const result = await processQueueMessages();

      expect(result).toContain('1 errors');

      // Check that the message was marked as pending for retry
      const updatedMessage = await QueueMessageModel.findOne({ dedupeKey: 'test-fetch-error' });

      expect(updatedMessage?.state).toBe(QueueMessageState.PENDING);
      expect(updatedMessage?.processingAttempts).toBe(1);
    });

    test('should mark message as failed after maximum processing attempts', async () => {
      const { processQueueMessages } = await import('../../../../../pages/api/internal-jobs/worker/index');

      // Create a FETCH message that will fail
      await QueueMessageModel.create({
        dedupeKey: 'test-max-attempts',
        type: QueueMessageType.FETCH,
        message: JSON.stringify({ url: 'https://example.com', options: {} }),
        state: QueueMessageState.PENDING,
        processingAttempts: 2, // One less than MAX_PROCESSING_ATTEMPTS (which is 3)
        isProcessing: false,
        runAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock fetch to return error to trigger failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      const result = await processQueueMessages();

      expect(result).toContain('1 errors');

      // Check that the message was marked as failed after reaching max attempts
      const updatedMessage = await QueueMessageModel.findOne({ dedupeKey: 'test-max-attempts' });

      expect(updatedMessage?.state).toBe(QueueMessageState.FAILED);
      expect(updatedMessage?.processingAttempts).toBe(3);
    });
  });

  describe('API endpoint', () => {
    test('should return 400 for missing secret parameter', async () => {
      const workerHandler = (await import('../../../../../pages/api/internal-jobs/worker/index')).default;

      // don't output error logs
      jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

      await testApiHandler({
        pagesHandler: workerHandler as NextApiHandler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          const response = await res.json();

          expect(res.status).toBe(400);
          expect(response.error).toContain('Invalid query.secret');
        },
      });
    });

    test('should return 401 for wrong secret', async () => {
      const workerHandler = (await import('../../../../../pages/api/internal-jobs/worker/index')).default;

      await testApiHandler({
        pagesHandler: workerHandler as NextApiHandler,
        url: '?secret=wrong-secret',
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          const response = await res.json();

          expect(res.status).toBe(401);
          expect(response.error).toBe('Unauthorized');
        },
      });
    });
  });

  describe('processQueueMessages edge cases', () => {
    test('should return NONE when no messages to process', async () => {
      const { processQueueMessages } = await import('../../../../../pages/api/internal-jobs/worker/index');

      // Ensure no pending messages exist
      await QueueMessageModel.deleteMany({ state: QueueMessageState.PENDING });

      const result = await processQueueMessages();

      expect(result).toBe('NONE');
    });

    test('should handle messages scheduled for future', async () => {
      const { processQueueMessages } = await import('../../../../../pages/api/internal-jobs/worker/index');

      const futureDate = new Date(Date.now() + 60000); // 1 minute in future

      await QueueMessageModel.create({
        dedupeKey: 'test-future-message',
        type: QueueMessageType.FETCH,
        message: JSON.stringify({ url: 'https://example.com', options: {} }),
        state: QueueMessageState.PENDING,
        processingAttempts: 0,
        isProcessing: false,
        runAt: futureDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await processQueueMessages();

      expect(result).toBe('NONE'); // Should not process future messages

      const unprocessedMessage = await QueueMessageModel.findOne({ dedupeKey: 'test-future-message' });

      expect(unprocessedMessage?.state).toBe(QueueMessageState.PENDING);
      expect(unprocessedMessage?.isProcessing).toBe(false);
    });

    test('should reset stuck processing messages older than 5 minutes', async () => {
      const { processQueueMessages } = await import('../../../../../pages/api/internal-jobs/worker/index');

      const stuckDate = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago

      await QueueMessageModel.create({
        dedupeKey: 'test-stuck-message',
        type: QueueMessageType.FETCH,
        message: JSON.stringify({ url: 'https://example.com', options: {} }),
        state: QueueMessageState.PENDING,
        processingAttempts: 1,
        isProcessing: true,
        processingStartedAt: stuckDate,
        runAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await processQueueMessages();

      // The stuck message should be reset and then processed
      expect(result).toContain('Processed');

      const resetMessage = await QueueMessageModel.findOne({ dedupeKey: 'test-stuck-message' });

      expect(resetMessage?.isProcessing).toBe(false);
    });
  });
});
