import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import { TimerUtil } from '@root/helpers/getTs';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { LevelModel, QueueMessageModel, RecordModel, StatModel } from '@root/models/mongoose';
import { QueueMessageState, QueueMessageType } from '@root/models/schemas/queueMessageSchema';
import { processQueueMessages } from '../../pages/api/internal-jobs/worker';
import { queuePublishLevel } from '../../pages/api/internal-jobs/worker/queueFunctions';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import MockDate from 'mockdate';

enableFetchMocks();

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  MockDate.reset();
  jest.restoreAllMocks();
});

describe('Scheduled Publishing Integration', () => {
  test('should complete full scheduled publishing workflow', async () => {
    const testLevelId = new Types.ObjectId();
    const testUserId = new Types.ObjectId(TestId.USER_PRO);
    const publishDate = new Date(Date.now() + 1000); // 1 second from now

    // Step 1: Create a draft level
    await LevelModel.create({
      _id: testLevelId,
      authorNote: 'Test integration level',
      data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000030',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: true,
      isRanked: false,
      leastMoves: 10,
      name: 'Test Integration Level',
      slug: 'test/test-integration-level',
      ts: TimerUtil.getTs(),
      userId: testUserId,
      width: 10,
    });

    // Step 2: Schedule the level for publishing
    const queueMessageId = await queuePublishLevel(testLevelId, publishDate);

    // Step 3: Update the level with the queue message ID (simulating the API)
    await LevelModel.findByIdAndUpdate(testLevelId, {
      scheduledQueueMessageId: queueMessageId,
    });

    // Verify the level is scheduled
    let level = await LevelModel.findById(testLevelId);
    expect(level.isDraft).toBe(true);
    expect(level.scheduledQueueMessageId).toEqual(queueMessageId);

    // Verify the queue message exists
    let queueMessage = await QueueMessageModel.findById(queueMessageId);
    expect(queueMessage.state).toBe(QueueMessageState.PENDING);
    expect(queueMessage.type).toBe(QueueMessageType.PUBLISH_LEVEL);

    // Step 4: Wait for the publish time to pass
    MockDate.set(Date.now() + 2000); // Move time forward

    // Step 5: Process the queue
    await processQueueMessages();

    // Step 6: Verify the level was published
    level = await LevelModel.findById(testLevelId);
    expect(level.isDraft).toBe(false);
    expect(level.scheduledQueueMessageId).toBeUndefined();
    expect(level.calc_stats_completed_count).toBe(1);
    expect(level.calc_stats_players_beaten).toBe(1);

    // Step 7: Verify the queue message was completed
    queueMessage = await QueueMessageModel.findById(queueMessageId);
    expect(queueMessage.state).toBe(QueueMessageState.COMPLETED);
    expect(queueMessage.log).toContain(`publishLevel for ${testLevelId} completed successfully`);

    // Step 8: Verify user records were created
    const userRecord = await RecordModel.findOne({
      levelId: testLevelId,
      userId: testUserId,
    });
    expect(userRecord).toBeTruthy();
    expect(userRecord.moves).toBe(10);

    const userStat = await StatModel.findOne({
      levelId: testLevelId,
      userId: testUserId,
    });
    expect(userStat).toBeTruthy();
    expect(userStat.moves).toBe(10);
    expect(userStat.complete).toBe(true);
  });

  test('should handle scheduling cancellation workflow', async () => {
    const testLevelId = new Types.ObjectId();
    const testUserId = new Types.ObjectId(TestId.USER_PRO);
    const publishDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now

    // Step 1: Create a draft level
    await LevelModel.create({
      _id: testLevelId,
      authorNote: 'Test cancellation level',
      data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000030',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: true,
      isRanked: false,
      leastMoves: 10,
      name: 'Test Cancellation Level',
      slug: 'test/test-cancellation-level',
      ts: TimerUtil.getTs(),
      userId: testUserId,
      width: 10,
    });

    // Step 2: Schedule the level for publishing
    const queueMessageId = await queuePublishLevel(testLevelId, publishDate);

    // Step 3: Update the level with the queue message ID
    await LevelModel.findByIdAndUpdate(testLevelId, {
      scheduledQueueMessageId: queueMessageId,
    });

    // Verify the level is scheduled
    let level = await LevelModel.findById(testLevelId);
    expect(level.scheduledQueueMessageId).toEqual(queueMessageId);

    // Step 4: Cancel the scheduled publishing (simulating the API)
    await QueueMessageModel.findByIdAndUpdate(queueMessageId, {
      state: QueueMessageState.FAILED,
      processingCompletedAt: new Date(),
      $push: {
        log: 'Canceled by user',
      },
    });

    await LevelModel.findByIdAndUpdate(testLevelId, {
      $unset: { scheduledQueueMessageId: 1 },
    });

    // Step 5: Verify the cancellation
    level = await LevelModel.findById(testLevelId);
    expect(level.isDraft).toBe(true); // Still a draft
    expect(level.scheduledQueueMessageId).toBeUndefined(); // No longer scheduled

    const queueMessage = await QueueMessageModel.findById(queueMessageId);
    expect(queueMessage.state).toBe(QueueMessageState.FAILED);
    expect(queueMessage.log).toContain('Canceled by user');

    // Step 6: Try to process the queue (should not publish the level)
    await processQueueMessages();

    // Step 7: Verify the level is still a draft
    level = await LevelModel.findById(testLevelId);
    expect(level.isDraft).toBe(true);

    // Verify no records were created
    const userRecord = await RecordModel.findOne({
      levelId: testLevelId,
      userId: testUserId,
    });
    expect(userRecord).toBeFalsy();
  });

  test('should handle multiple levels scheduled at different times', async () => {
    const testLevelId1 = new Types.ObjectId();
    const testLevelId2 = new Types.ObjectId();
    const testLevelId3 = new Types.ObjectId();
    const testUserId = new Types.ObjectId(TestId.USER_PRO);
    
    const now = Date.now();
    const publishDate1 = new Date(now + 1000); // 1 second from now
    const publishDate2 = new Date(now + 2000); // 2 seconds from now
    const publishDate3 = new Date(now + 24 * 60 * 60 * 1000); // 1 day from now (future)

    // Create three draft levels
    await LevelModel.create([
      {
        _id: testLevelId1,
        authorNote: 'Test level 1',
        data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000030',
        gameId: DEFAULT_GAME_ID,
        height: 5,
        isDraft: true,
        isRanked: false,
        leastMoves: 10,
        name: 'Test Level 1',
        slug: 'test/test-level-1-multi',
        ts: TimerUtil.getTs(),
        userId: testUserId,
        width: 10,
      },
      {
        _id: testLevelId2,
        authorNote: 'Test level 2',
        data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000030',
        gameId: DEFAULT_GAME_ID,
        height: 5,
        isDraft: true,
        isRanked: false,
        leastMoves: 15,
        name: 'Test Level 2',
        slug: 'test/test-level-2-multi',
        ts: TimerUtil.getTs(),
        userId: testUserId,
        width: 10,
      },
      {
        _id: testLevelId3,
        authorNote: 'Test level 3',
        data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000030',
        gameId: DEFAULT_GAME_ID,
        height: 5,
        isDraft: true,
        isRanked: false,
        leastMoves: 20,
        name: 'Test Level 3',
        slug: 'test/test-level-3-multi',
        ts: TimerUtil.getTs(),
        userId: testUserId,
        width: 10,
      }
    ]);

    // Schedule all three levels
    const queueMessageId1 = await queuePublishLevel(testLevelId1, publishDate1);
    const queueMessageId2 = await queuePublishLevel(testLevelId2, publishDate2);
    const queueMessageId3 = await queuePublishLevel(testLevelId3, publishDate3);

    // Update levels with queue message IDs
    await Promise.all([
      LevelModel.findByIdAndUpdate(testLevelId1, { scheduledQueueMessageId: queueMessageId1 }),
      LevelModel.findByIdAndUpdate(testLevelId2, { scheduledQueueMessageId: queueMessageId2 }),
      LevelModel.findByIdAndUpdate(testLevelId3, { scheduledQueueMessageId: queueMessageId3 }),
    ]);

    // Move time forward to after the first two publish dates but before the third
    MockDate.set(now + 3000);

    // Process the queue
    await processQueueMessages();

    // Verify first two levels were published, third is still scheduled
    const level1 = await LevelModel.findById(testLevelId1);
    const level2 = await LevelModel.findById(testLevelId2);
    const level3 = await LevelModel.findById(testLevelId3);

    expect(level1.isDraft).toBe(false); // Published
    expect(level2.isDraft).toBe(false); // Published
    expect(level3.isDraft).toBe(true);  // Still draft (scheduled for future)

    expect(level1.scheduledQueueMessageId).toBeUndefined();
    expect(level2.scheduledQueueMessageId).toBeUndefined();
    expect(level3.scheduledQueueMessageId).toEqual(queueMessageId3); // Still scheduled

    // Verify queue message states
    const message1 = await QueueMessageModel.findById(queueMessageId1);
    const message2 = await QueueMessageModel.findById(queueMessageId2);
    const message3 = await QueueMessageModel.findById(queueMessageId3);

    expect(message1.state).toBe(QueueMessageState.COMPLETED);
    expect(message2.state).toBe(QueueMessageState.COMPLETED);
    expect(message3.state).toBe(QueueMessageState.PENDING); // Still pending
  });
});