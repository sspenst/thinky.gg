import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import { TimerUtil } from '@root/helpers/getTs';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { LevelModel, QueueMessageModel, RecordModel, StatModel, UserConfigModel } from '@root/models/mongoose';
import { QueueMessageState, QueueMessageType } from '@root/models/schemas/queueMessageSchema';
import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { Types } from 'mongoose';
import { processQueueMessages } from '../../../../../pages/api/internal-jobs/worker';

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

describe('PUBLISH_LEVEL queue worker', () => {
  test('should successfully publish a scheduled level', async () => {
    const testLevelId = new Types.ObjectId();
    const queueMessageId = new Types.ObjectId();
    const testUserId = new Types.ObjectId(TestId.USER_PRO);

    // Create a draft level
    await LevelModel.create({
      _id: testLevelId,
      authorNote: 'Test scheduled level',
      data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000030',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: true,
      isRanked: false,
      leastMoves: 10,
      name: 'Test Scheduled Level',
      slug: 'test/test-scheduled-level',
      ts: TimerUtil.getTs(),
      userId: testUserId,
      width: 10,
      scheduledQueueMessageId: queueMessageId,
    });

    // Create the queue message
    await QueueMessageModel.create({
      _id: queueMessageId,
      dedupeKey: `publish-level-${testLevelId.toString()}`,
      message: JSON.stringify({ levelId: testLevelId.toString() }),
      state: QueueMessageState.PENDING,
      type: QueueMessageType.PUBLISH_LEVEL,
      runAt: new Date(Date.now() - 1000), // Past time, should be processed
      processingAttempts: 0,
      isProcessing: false,
    });

    // Process the queue
    await processQueueMessages();

    // Verify the level was published
    const publishedLevel = await LevelModel.findById(testLevelId);

    expect(publishedLevel.isDraft).toBe(false);
    expect(publishedLevel.scheduledQueueMessageId).toBeUndefined();
    expect(publishedLevel.calc_stats_completed_count).toBe(1);
    expect(publishedLevel.calc_stats_players_beaten).toBe(1);

    // Verify queue message was completed
    const completedMessage = await QueueMessageModel.findById(queueMessageId);

    expect(completedMessage.state).toBe(QueueMessageState.COMPLETED);
    expect(completedMessage.log).toContain(`publishLevel for ${testLevelId} completed successfully`);

    // Verify user stats were created
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

  test('should fail to publish level that does not exist', async () => {
    const nonExistentLevelId = new Types.ObjectId();
    const queueMessageId = new Types.ObjectId();

    // Create queue message for non-existent level
    await QueueMessageModel.create({
      _id: queueMessageId,
      dedupeKey: `publish-level-${nonExistentLevelId.toString()}`,
      message: JSON.stringify({ levelId: nonExistentLevelId.toString() }),
      state: QueueMessageState.PENDING,
      type: QueueMessageType.PUBLISH_LEVEL,
      runAt: new Date(Date.now() - 1000),
      processingAttempts: 0,
      isProcessing: false,
    });

    // Process the queue
    await processQueueMessages();

    // Verify queue message failed
    const failedMessage = await QueueMessageModel.findById(queueMessageId);

    expect(failedMessage.state).toBe(QueueMessageState.PENDING); // Will retry due to error
    expect(failedMessage.log).toContain(`publishLevel for ${nonExistentLevelId} failed: level not found`);
  });

  test('should fail to publish level that is already published', async () => {
    const testLevelId = new Types.ObjectId();
    const queueMessageId = new Types.ObjectId();
    const testUserId = new Types.ObjectId(TestId.USER_PRO);

    // Create a published level (not draft)
    await LevelModel.create({
      _id: testLevelId,
      authorNote: 'Test already published level',
      data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000030',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: false, // Already published
      isRanked: false,
      leastMoves: 10,
      name: 'Test Already Published Level',
      slug: 'test/test-already-published-level',
      ts: TimerUtil.getTs(),
      userId: testUserId,
      width: 10,
      scheduledQueueMessageId: queueMessageId,
    });

    // Create the queue message
    await QueueMessageModel.create({
      _id: queueMessageId,
      dedupeKey: `publish-level-${testLevelId.toString()}`,
      message: JSON.stringify({ levelId: testLevelId.toString() }),
      state: QueueMessageState.PENDING,
      type: QueueMessageType.PUBLISH_LEVEL,
      runAt: new Date(Date.now() - 1000),
      processingAttempts: 0,
      isProcessing: false,
    });

    // Process the queue
    await processQueueMessages();

    // Verify queue message failed
    const failedMessage = await QueueMessageModel.findById(queueMessageId);

    expect(failedMessage.state).toBe(QueueMessageState.PENDING); // Will retry due to error
    expect(failedMessage.log).toContain(`publishLevel for ${testLevelId} failed: level is not a draft`);
  });

  test('should not process queue message scheduled for future', async () => {
    const testLevelId = new Types.ObjectId();
    const queueMessageId = new Types.ObjectId();
    const testUserId = new Types.ObjectId(TestId.USER_PRO);

    // Create a draft level
    await LevelModel.create({
      _id: testLevelId,
      authorNote: 'Test future scheduled level',
      data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000030',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: true,
      isRanked: false,
      leastMoves: 10,
      name: 'Test Future Scheduled Level',
      slug: 'test/test-future-scheduled-level',
      ts: TimerUtil.getTs(),
      userId: testUserId,
      width: 10,
      scheduledQueueMessageId: queueMessageId,
    });

    // Create queue message scheduled for future
    await QueueMessageModel.create({
      _id: queueMessageId,
      dedupeKey: `publish-level-${testLevelId.toString()}`,
      message: JSON.stringify({ levelId: testLevelId.toString() }),
      state: QueueMessageState.PENDING,
      type: QueueMessageType.PUBLISH_LEVEL,
      runAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day in future
      processingAttempts: 0,
      isProcessing: false,
    });

    // Process the queue
    await processQueueMessages();

    // Verify the level was NOT published
    const level = await LevelModel.findById(testLevelId);

    expect(level.isDraft).toBe(true); // Still a draft
    expect(level.scheduledQueueMessageId).toEqual(queueMessageId); // Still scheduled

    // Verify queue message is still pending
    const pendingMessage = await QueueMessageModel.findById(queueMessageId);

    expect(pendingMessage.state).toBe(QueueMessageState.PENDING);
    expect(pendingMessage.isProcessing).toBe(false);
  });

  test('should update user config when publishing level', async () => {
    const testLevelId = new Types.ObjectId();
    const queueMessageId = new Types.ObjectId();
    const testUserId = new Types.ObjectId(); // Use unique user ID

    // Create initial user config
    await UserConfigModel.create({
      userId: testUserId,
      gameId: DEFAULT_GAME_ID,
      calcLevelsSolvedCount: 5,
      calcLevelsCompletedCount: 3,
      theme: 'modern',
    });

    // Create a draft level
    await LevelModel.create({
      _id: testLevelId,
      authorNote: 'Test user config update',
      data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000030',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: true,
      isRanked: false,
      leastMoves: 10,
      name: 'Test User Config Update',
      slug: 'test/test-user-config-update',
      ts: TimerUtil.getTs(),
      userId: testUserId,
      width: 10,
      scheduledQueueMessageId: queueMessageId,
    });

    // Create the queue message
    await QueueMessageModel.create({
      _id: queueMessageId,
      dedupeKey: `publish-level-${testLevelId.toString()}`,
      message: JSON.stringify({ levelId: testLevelId.toString() }),
      state: QueueMessageState.PENDING,
      type: QueueMessageType.PUBLISH_LEVEL,
      runAt: new Date(Date.now() - 1000),
      processingAttempts: 0,
      isProcessing: false,
    });

    // Process the queue
    await processQueueMessages();

    // Verify user config was updated
    const updatedUserConfig = await UserConfigModel.findOne({
      userId: testUserId,
      gameId: DEFAULT_GAME_ID,
    });

    expect(updatedUserConfig.calcLevelsSolvedCount).toBe(6); // Incremented by 1
    expect(updatedUserConfig.calcLevelsCompletedCount).toBe(4); // Incremented by 1
  });

  test('should handle multiple scheduled levels in correct order', async () => {
    const testLevelId1 = new Types.ObjectId();
    const testLevelId2 = new Types.ObjectId();
    const queueMessageId1 = new Types.ObjectId();
    const queueMessageId2 = new Types.ObjectId();
    const testUserId = new Types.ObjectId(); // Use unique user ID

    // Create two draft levels
    await LevelModel.create({
      _id: testLevelId1,
      authorNote: 'Test level 1',
      data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000030',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: true,
      isRanked: false,
      leastMoves: 10,
      name: 'Test Level 1',
      slug: 'test/test-level-1-multiple-order',
      ts: TimerUtil.getTs(),
      userId: testUserId,
      width: 10,
      scheduledQueueMessageId: queueMessageId1,
    });

    await LevelModel.create({
      _id: testLevelId2,
      authorNote: 'Test level 2',
      data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000030',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: true,
      isRanked: false,
      leastMoves: 15,
      name: 'Test Level 2',
      slug: 'test/test-level-2-multiple-order',
      ts: TimerUtil.getTs(),
      userId: testUserId,
      width: 10,
      scheduledQueueMessageId: queueMessageId2,
    });

    // Create queue messages - second one scheduled earlier
    await QueueMessageModel.create({
      _id: queueMessageId1,
      dedupeKey: `publish-level-${testLevelId1.toString()}`,
      message: JSON.stringify({ levelId: testLevelId1.toString() }),
      state: QueueMessageState.PENDING,
      type: QueueMessageType.PUBLISH_LEVEL,
      runAt: new Date(Date.now() - 500), // Later time
      processingAttempts: 0,
      isProcessing: false,
    });

    await QueueMessageModel.create({
      _id: queueMessageId2,
      dedupeKey: `publish-level-${testLevelId2.toString()}`,
      message: JSON.stringify({ levelId: testLevelId2.toString() }),
      state: QueueMessageState.PENDING,
      type: QueueMessageType.PUBLISH_LEVEL,
      runAt: new Date(Date.now() - 1000), // Earlier time
      processingAttempts: 0,
      isProcessing: false,
    });

    // Process the queue
    await processQueueMessages();

    // Verify both levels were published
    const level1 = await LevelModel.findById(testLevelId1);
    const level2 = await LevelModel.findById(testLevelId2);

    expect(level1.isDraft).toBe(false);
    expect(level2.isDraft).toBe(false);
    expect(level1.scheduledQueueMessageId).toBeUndefined();
    expect(level2.scheduledQueueMessageId).toBeUndefined();

    // Verify both queue messages completed
    const message1 = await QueueMessageModel.findById(queueMessageId1);
    const message2 = await QueueMessageModel.findById(queueMessageId2);

    expect(message1.state).toBe(QueueMessageState.COMPLETED);
    expect(message2.state).toBe(QueueMessageState.COMPLETED);
  });
});
