import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { QueueMessageModel } from '@root/models/mongoose';
import { QueueMessageState, QueueMessageType } from '@root/models/schemas/queueMessageSchema';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { queuePublishLevel } from '../../../../../pages/api/internal-jobs/worker/queueFunctions';

enableFetchMocks();

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

describe('queuePublishLevel function', () => {
  test('should create a queue message for publishing a level', async () => {
    const testLevelId = new Types.ObjectId();
    const publishDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now

    const queueMessageId = await queuePublishLevel(testLevelId, publishDate);

    expect(queueMessageId).toBeInstanceOf(Types.ObjectId);

    // Verify the queue message was created correctly
    const queueMessage = await QueueMessageModel.findById(queueMessageId);

    expect(queueMessage).toBeTruthy();
    expect(queueMessage.type).toBe(QueueMessageType.PUBLISH_LEVEL);
    expect(queueMessage.state).toBe(QueueMessageState.PENDING);
    expect(queueMessage.dedupeKey).toBe(`publish-level-${testLevelId.toString()}`);
    expect(queueMessage.runAt).toEqual(publishDate);
    expect(queueMessage.processingAttempts).toBe(0);
    expect(queueMessage.isProcessing).toBe(false);

    // Verify the message contains the correct level ID
    const messageData = JSON.parse(queueMessage.message);

    expect(messageData.levelId).toBe(testLevelId.toString());
  });

  test('should create queue message with session option', async () => {
    const testLevelId = new Types.ObjectId();
    const publishDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create a mock session object
    const mockSession = {
      id: 'mock-session-id',
    };

    const queueMessageId = await queuePublishLevel(testLevelId, publishDate, { session: mockSession });

    expect(queueMessageId).toBeInstanceOf(Types.ObjectId);

    // Verify the queue message was created
    const queueMessage = await QueueMessageModel.findById(queueMessageId);

    expect(queueMessage).toBeTruthy();
    expect(queueMessage.type).toBe(QueueMessageType.PUBLISH_LEVEL);
  });

  test('should handle different publish dates correctly', async () => {
    const testLevelId1 = new Types.ObjectId();
    const testLevelId2 = new Types.ObjectId();
    const publishDate1 = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now
    const publishDate2 = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now

    const queueMessageId1 = await queuePublishLevel(testLevelId1, publishDate1);
    const queueMessageId2 = await queuePublishLevel(testLevelId2, publishDate2);

    // Verify both messages were created with correct dates
    const queueMessage1 = await QueueMessageModel.findById(queueMessageId1);
    const queueMessage2 = await QueueMessageModel.findById(queueMessageId2);

    expect(queueMessage1.runAt).toEqual(publishDate1);
    expect(queueMessage2.runAt).toEqual(publishDate2);
    expect(queueMessage1.dedupeKey).toBe(`publish-level-${testLevelId1.toString()}`);
    expect(queueMessage2.dedupeKey).toBe(`publish-level-${testLevelId2.toString()}`);
  });

  test('should create unique queue messages for different levels', async () => {
    const testLevelId1 = new Types.ObjectId();
    const testLevelId2 = new Types.ObjectId();
    const publishDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const queueMessageId1 = await queuePublishLevel(testLevelId1, publishDate);
    const queueMessageId2 = await queuePublishLevel(testLevelId2, publishDate);

    expect(queueMessageId1).not.toEqual(queueMessageId2);

    // Verify both messages exist and have different dedupe keys
    const queueMessage1 = await QueueMessageModel.findById(queueMessageId1);
    const queueMessage2 = await QueueMessageModel.findById(queueMessageId2);

    expect(queueMessage1.dedupeKey).toBe(`publish-level-${testLevelId1.toString()}`);
    expect(queueMessage2.dedupeKey).toBe(`publish-level-${testLevelId2.toString()}`);
    expect(queueMessage1.dedupeKey).not.toBe(queueMessage2.dedupeKey);
  });

  test('should handle immediate publish dates', async () => {
    const testLevelId = new Types.ObjectId();
    const publishDate = new Date(); // Right now

    const queueMessageId = await queuePublishLevel(testLevelId, publishDate);

    const queueMessage = await QueueMessageModel.findById(queueMessageId);

    expect(queueMessage).toBeTruthy();
    expect(queueMessage.runAt.getTime()).toBeCloseTo(publishDate.getTime(), -3); // Within 1 second
  });
});
