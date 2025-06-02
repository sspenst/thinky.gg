import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { QueueMessageModel } from '@root/models/mongoose';
import { QueueMessageState, QueueMessageType } from '@root/models/schemas/queueMessageSchema';
import { Types } from 'mongoose';
import { NextApiHandler } from 'next';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { logger } from '../../../../../helpers/logger';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(async () => {
  jest.restoreAllMocks();
  // Clean up any test queue messages
  await QueueMessageModel.deleteMany({ dedupeKey: { $regex: /^test-/ } });
});

describe('pages/api/internal-jobs/worker', () => {
  describe('Queue functions', () => {
    test('basic queue function should create queue message', async () => {
      const { queue } = await import('../../../../../pages/api/internal-jobs/worker/index');

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
      const { queue } = await import('../../../../../pages/api/internal-jobs/worker/index');

      const dedupeKey = 'test-queue-scheduled';
      const type = QueueMessageType.FETCH;
      const message = JSON.stringify({ url: 'https://example.com' });
      const runAt = new Date(Date.now() + 60000); // 1 minute in future

      await queue(dedupeKey, type, message, undefined, runAt);

      const queueMessage = await QueueMessageModel.findOne({ dedupeKey });

      expect(queueMessage?.runAt).toEqual(runAt);
    });

    test('queuePushNotification should create both push and email messages', async () => {
      const { queuePushNotification } = await import('../../../../../pages/api/internal-jobs/worker/index');

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

    test('bulkQueueCalcPlayAttempts should create multiple calc messages', async () => {
      const { bulkQueueCalcPlayAttempts } = await import('../../../../../pages/api/internal-jobs/worker/index');

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
      const { bulkQueueCalcPlayAttempts } = await import('../../../../../pages/api/internal-jobs/worker/index');

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
      const { queueFetch } = await import('../../../../../pages/api/internal-jobs/worker/index');

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
      const { queueCalcCreatorCounts } = await import('../../../../../pages/api/internal-jobs/worker/index');

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
      const { queueGenLevelImage } = await import('../../../../../pages/api/internal-jobs/worker/index');

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
      const { queueRefreshIndexCalcs } = await import('../../../../../pages/api/internal-jobs/worker/index');

      const levelId = new Types.ObjectId();

      await queueRefreshIndexCalcs(levelId);

      const queueMessage = await QueueMessageModel.findOne({
        dedupeKey: levelId.toString(),
        type: QueueMessageType.REFRESH_INDEX_CALCULATIONS
      });

      expect(queueMessage).toBeDefined();
    });

    test('queueCalcPlayAttempts should create calc play attempts message', async () => {
      const { queueCalcPlayAttempts } = await import('../../../../../pages/api/internal-jobs/worker/index');

      const levelId = new Types.ObjectId();

      await queueCalcPlayAttempts(levelId);

      const queueMessage = await QueueMessageModel.findOne({
        dedupeKey: levelId.toString(),
        type: QueueMessageType.CALC_PLAY_ATTEMPTS
      });

      expect(queueMessage).toBeDefined();
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
  });
});
