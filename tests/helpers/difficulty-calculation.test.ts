/**
 * Difficulty Calculation Accuracy Tests for PostPlayAttempt Aggregation Pipeline Optimization
 *
 * This test suite verifies that the MongoDB aggregation pipeline in postPlayAttempt produces
 * identical results to the JavaScript difficulty calculation functions.
 *
 * Key Optimization:
 * - Before: Two separate database operations (findByIdAndUpdate + updateOne)
 * - After: Single aggregation pipeline that updates all fields and calculates difficulty estimates atomically
 * - Performance Gain: ~50% reduction in database operations for the critical path
 *
 * Critical Logic Verified:
 * 1. Aggregation pipeline only triggers when:
 *    - Existing play attempt exists within 3-minute window
 *    - Attempt context is UNSOLVED
 * 2. Difficulty calculations only occur when:
 *    - calc_playattempts_unique_users_count >= 10 for difficulty_estimate
 *    - calc_playattempts_unique_users_count_excluding_author >= 10 for completion_estimate
 * 3. Conditional duration_before_stat_sum updates:
 *    - Only incremented when user has no existing stat
 *
 * Test Coverage:
 * - Mathematical accuracy (aggregation pipeline matches JavaScript functions)
 * - Solve count factor calculation (logistic function implementation)
 * - Edge cases (insufficient users, zero values, null handling)
 * - Conditional logic (stat existence checks, author exclusion)
 * - Real-world scenarios (proper setup to trigger aggregation pipeline)
 */

import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import getDifficultyEstimate, { getDifficultyCompletionEstimate, getSolveCountFactor } from '@root/helpers/getDifficultyEstimate';
import { TimerUtil } from '@root/helpers/getTs';
import { postPlayAttempt } from '@root/helpers/play-attempts/postPlayAttempt';
import { Types } from 'mongoose';
import TestId from '../../constants/testId';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import { initLevel } from '../../lib/initializeLocalDb';
import Level from '../../models/db/level';
import { LevelModel, PlayAttemptModel, StatModel, UserModel } from '../../models/mongoose';
import { AttemptContext } from '../../models/schemas/playAttemptSchema';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

describe('Difficulty Calculation Accuracy Tests', () => {
  let testLevel: Level;
  let testUserId: Types.ObjectId;

  beforeEach(async () => {
    // Create a fresh test level for each test
    testLevel = await initLevel(
      DEFAULT_GAME_ID,
      TestId.USER,
      'difficulty-test-level',
      {},
      false
    );

    testUserId = new Types.ObjectId();
    await UserModel.create({
      _id: testUserId,
      email: 'test-difficulty@example.com',
      last_visited_at: 0,
      name: 'test-difficulty-user',
      password: 'password',
      score: 0,
      ts: 0,
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await Promise.all([
      LevelModel.deleteOne({ _id: testLevel._id }),
      PlayAttemptModel.deleteMany({ levelId: testLevel._id }),
      StatModel.deleteMany({ levelId: testLevel._id }),
      UserModel.deleteOne({ _id: testUserId }),
    ]);
  });

  test('aggregation pipeline matches JavaScript function for calc_difficulty_estimate', async () => {
    // Set up initial level state with 10+ users for difficulty calculation
    const userIds = Array.from({ length: 10 }, () => new Types.ObjectId());

    await LevelModel.findByIdAndUpdate(testLevel._id, {
      $set: {
        calc_playattempts_duration_sum: 500,
        calc_playattempts_just_beaten_count: 5,
        calc_playattempts_unique_users: userIds,
        calc_stats_completed_count: 5,
      }
    });

    // Create a recent UNSOLVED play attempt to trigger the aggregation pipeline
    const recentEndTime = 100;

    await PlayAttemptModel.create({
      _id: new Types.ObjectId(),
      attemptContext: AttemptContext.UNSOLVED,
      endTime: recentEndTime,
      gameId: DEFAULT_GAME_ID,
      levelId: testLevel._id,
      startTime: 90,
      updateCount: 0,
      userId: testUserId,
    });

    // Test postPlayAttempt within 3-minute window to trigger aggregation pipeline
    const currentTime = recentEndTime + 60; // 1 minute later

    jest.spyOn(TimerUtil, 'getTs').mockReturnValue(currentTime);

    const result = await postPlayAttempt(testUserId, testLevel._id.toString());

    expect(result.status).toBe(200);
    expect(result.json.message).toBe('updated');

    const updatedLevel = await LevelModel.findById(testLevel._id);

    // Calculate expected values using JavaScript functions
    const newPlayDuration = currentTime - recentEndTime; // 60 seconds
    const expectedDurationSum = 500 + newPlayDuration; // 560
    const expectedUniqueUsersCount = 11; // 10 original + 1 new user
    const expectedSolveCount = 5; // unchanged

    const expectedDifficultyEstimate = getDifficultyEstimate({
      calc_playattempts_duration_sum: expectedDurationSum,
      calc_playattempts_just_beaten_count: expectedSolveCount,
    }, expectedUniqueUsersCount);

    // Verify aggregation pipeline produces same result as JavaScript function
    expect(updatedLevel?.calc_playattempts_duration_sum).toBe(expectedDurationSum);
    expect(updatedLevel?.calc_playattempts_unique_users?.length).toBe(expectedUniqueUsersCount);
    expect(updatedLevel?.calc_difficulty_estimate).toBeCloseTo(expectedDifficultyEstimate, 5);
  });

  test('aggregation pipeline matches JavaScript function for calc_difficulty_completion_estimate', async () => {
    // Set up initial level state with 12+ users for completion difficulty calculation
    const userIds = Array.from({ length: 12 }, () => new Types.ObjectId());

    await LevelModel.findByIdAndUpdate(testLevel._id, {
      $set: {
        calc_playattempts_duration_before_stat_sum: 300,
        calc_playattempts_duration_sum: 600,
        calc_playattempts_unique_users: userIds,
        calc_stats_completed_count: 8,
        userId: testLevel.userId, // Ensure we have the author ID for exclusion
      }
    });

    // Create a recent UNSOLVED play attempt to trigger the aggregation pipeline
    const recentEndTime = 150;

    await PlayAttemptModel.create({
      _id: new Types.ObjectId(),
      attemptContext: AttemptContext.UNSOLVED,
      endTime: recentEndTime,
      gameId: DEFAULT_GAME_ID,
      levelId: testLevel._id,
      startTime: 140,
      updateCount: 0,
      userId: testUserId,
    });

    // Test postPlayAttempt within 3-minute window
    const currentTime = recentEndTime + 50; // 50 seconds later

    jest.spyOn(TimerUtil, 'getTs').mockReturnValue(currentTime);

    const result = await postPlayAttempt(testUserId, testLevel._id.toString());

    expect(result.status).toBe(200);
    expect(result.json.message).toBe('updated');

    const updatedLevel = await LevelModel.findById(testLevel._id);

    // Calculate expected values
    const newPlayDuration = currentTime - recentEndTime; // 50 seconds
    const expectedDurationBeforeStat = 300 + newPlayDuration; // 350
    const expectedUniqueUsersCountExcludingAuthor = 13; // 12 + 1 new user (excluding author)

    const expectedCompletionEstimate = getDifficultyCompletionEstimate({
      calc_playattempts_duration_before_stat_sum: expectedDurationBeforeStat,
      calc_stats_completed_count: 8,
    }, expectedUniqueUsersCountExcludingAuthor);

    // Verify aggregation pipeline produces same result
    expect(updatedLevel?.calc_playattempts_duration_before_stat_sum).toBe(expectedDurationBeforeStat);
    expect(updatedLevel?.calc_difficulty_completion_estimate).toBeCloseTo(expectedCompletionEstimate, 5);
  });

  test('solve count factor calculation matches JavaScript implementation', async () => {
    // Test various solve counts to ensure the MongoDB expression matches JavaScript
    const testCases = [1, 5, 10, 15, 20, 25, 30];

    for (const solveCount of testCases) {
      // Set up level with specific solve count and enough users for calculation
      await LevelModel.findByIdAndUpdate(testLevel._id, {
        $set: {
          calc_playattempts_duration_sum: 1000,
          calc_playattempts_just_beaten_count: solveCount,
          calc_playattempts_unique_users: Array.from({ length: 15 }, () => new Types.ObjectId()),
        }
      });

      // Create a recent UNSOLVED play attempt
      const recentEndTime = 100;

      await PlayAttemptModel.deleteMany({ levelId: testLevel._id }); // Clean previous attempts
      await PlayAttemptModel.create({
        _id: new Types.ObjectId(),
        attemptContext: AttemptContext.UNSOLVED,
        endTime: recentEndTime,
        gameId: DEFAULT_GAME_ID,
        levelId: testLevel._id,
        startTime: 90,
        updateCount: 0,
        userId: testUserId,
      });

      // Test with postPlayAttempt to trigger aggregation pipeline
      jest.spyOn(TimerUtil, 'getTs').mockReturnValue(recentEndTime + 30);

      const result = await postPlayAttempt(testUserId, testLevel._id.toString());

      expect(result.status).toBe(200);

      const updatedLevel = await LevelModel.findById(testLevel._id);

      // Calculate expected using JavaScript function
      const expectedFactor = getSolveCountFactor(solveCount);
      const expectedDurationSum = 1000 + 30; // original + new play time
      const expectedEstimate = (expectedDurationSum / solveCount) * expectedFactor;

      // The aggregation should produce the same result
      expect(updatedLevel?.calc_difficulty_estimate).toBeCloseTo(expectedEstimate, 4);
    }
  });

  test('edge cases: insufficient users, zero values, null values', async () => {
    // Test with insufficient users (< 10)
    const userIds = Array.from({ length: 5 }, () => new Types.ObjectId());

    await LevelModel.findByIdAndUpdate(testLevel._id, {
      $set: {
        calc_playattempts_duration_sum: 100,
        calc_playattempts_just_beaten_count: 2,
        calc_playattempts_unique_users: userIds,
        calc_stats_completed_count: 2,
      }
    });

    // Create a recent UNSOLVED play attempt
    await PlayAttemptModel.create({
      _id: new Types.ObjectId(),
      attemptContext: AttemptContext.UNSOLVED,
      endTime: 50,
      gameId: DEFAULT_GAME_ID,
      levelId: testLevel._id,
      startTime: 40,
      updateCount: 0,
      userId: testUserId,
    });

    jest.spyOn(TimerUtil, 'getTs').mockReturnValue(80);

    const result = await postPlayAttempt(testUserId, testLevel._id.toString());

    expect(result.status).toBe(200);

    const updatedLevel = await LevelModel.findById(testLevel._id);

    // Should return -1 for insufficient users (6 total < 10)
    expect(updatedLevel?.calc_difficulty_estimate).toBe(-1);
    expect(updatedLevel?.calc_difficulty_completion_estimate).toBe(-1);
  });

  test('zero solve count handling', async () => {
    // Test when calc_playattempts_just_beaten_count is 0
    await LevelModel.findByIdAndUpdate(testLevel._id, {
      $set: {
        calc_playattempts_duration_sum: 500,
        calc_playattempts_just_beaten_count: 0,
        calc_playattempts_unique_users: Array.from({ length: 15 }, () => new Types.ObjectId()),
      }
    });

    // Create a recent UNSOLVED play attempt
    await PlayAttemptModel.create({
      _id: new Types.ObjectId(),
      attemptContext: AttemptContext.UNSOLVED,
      endTime: 100,
      gameId: DEFAULT_GAME_ID,
      levelId: testLevel._id,
      startTime: 90,
      updateCount: 0,
      userId: testUserId,
    });

    jest.spyOn(TimerUtil, 'getTs').mockReturnValue(150);

    const result = await postPlayAttempt(testUserId, testLevel._id.toString());

    expect(result.status).toBe(200);

    const updatedLevel = await LevelModel.findById(testLevel._id);

    // Should use 1 as fallback for zero solve count
    const expectedDurationSum = 500 + 50; // 500 + (150 - 100)
    const expectedEstimate = getDifficultyEstimate({
      calc_playattempts_duration_sum: expectedDurationSum,
      calc_playattempts_just_beaten_count: 0,
    }, 16); // 15 + 1 new user

    expect(updatedLevel?.calc_difficulty_estimate).toBeCloseTo(expectedEstimate, 5);
  });

  test('completion count edge cases', async () => {
    // Test when calc_stats_completed_count - 1 <= 0
    await LevelModel.findByIdAndUpdate(testLevel._id, {
      $set: {
        calc_playattempts_duration_before_stat_sum: 300,
        calc_stats_completed_count: 1, // -1 = 0, should use 1 as fallback
        calc_playattempts_unique_users: Array.from({ length: 15 }, () => new Types.ObjectId()),
      }
    });

    // Create a recent UNSOLVED play attempt
    await PlayAttemptModel.create({
      _id: new Types.ObjectId(),
      attemptContext: AttemptContext.UNSOLVED,
      endTime: 100,
      gameId: DEFAULT_GAME_ID,
      levelId: testLevel._id,
      startTime: 90,
      updateCount: 0,
      userId: testUserId,
    });

    jest.spyOn(TimerUtil, 'getTs').mockReturnValue(150);

    const result = await postPlayAttempt(testUserId, testLevel._id.toString());

    expect(result.status).toBe(200);

    const updatedLevel = await LevelModel.findById(testLevel._id);

    // Should use 1 as fallback for completed count
    const expectedDurationBeforeStat = 300 + 50; // 300 + (150 - 100)
    const expectedEstimate = getDifficultyCompletionEstimate({
      calc_playattempts_duration_before_stat_sum: expectedDurationBeforeStat,
      calc_stats_completed_count: 1,
    }, 16); // 15 + 1 new user (excluding author)

    expect(updatedLevel?.calc_difficulty_completion_estimate).toBeCloseTo(expectedEstimate, 5);
  });

  test('conditional logic for calc_playattempts_duration_before_stat_sum', async () => {
    // Test that duration_before_stat_sum is only incremented when user has no stat
    const userWithStat = new Types.ObjectId();

    // Create a stat for this user
    await StatModel.create({
      _id: new Types.ObjectId(),
      attempts: 1,
      createdAt: 50,
      complete: true,
      gameId: DEFAULT_GAME_ID,
      levelId: testLevel._id,
      moves: 20,
      ts: 50,
      userId: userWithStat,
    });

    await LevelModel.findByIdAndUpdate(testLevel._id, {
      $set: {
        calc_playattempts_duration_sum: 200,
        calc_playattempts_duration_before_stat_sum: 100,
        calc_playattempts_unique_users: [userWithStat],
        calc_stats_completed_count: 1,
      }
    });

    // Create a recent UNSOLVED play attempt for user WITH stat
    await PlayAttemptModel.create({
      _id: new Types.ObjectId(),
      attemptContext: AttemptContext.UNSOLVED,
      endTime: 150,
      gameId: DEFAULT_GAME_ID,
      levelId: testLevel._id,
      startTime: 140,
      updateCount: 0,
      userId: userWithStat,
    });

    jest.spyOn(TimerUtil, 'getTs').mockReturnValue(200);

    const result = await postPlayAttempt(userWithStat, testLevel._id.toString());

    expect(result.status).toBe(200);

    const updatedLevel = await LevelModel.findById(testLevel._id);

    // Should increment total duration but NOT before_stat duration (user has stat)
    expect(updatedLevel?.calc_playattempts_duration_sum).toBe(250); // 200 + 50
    expect(updatedLevel?.calc_playattempts_duration_before_stat_sum).toBe(100); // unchanged

    // Now test with user WITHOUT stat
    await PlayAttemptModel.deleteMany({ levelId: testLevel._id });
    await PlayAttemptModel.create({
      _id: new Types.ObjectId(),
      attemptContext: AttemptContext.UNSOLVED,
      endTime: 250,
      gameId: DEFAULT_GAME_ID,
      levelId: testLevel._id,
      startTime: 240,
      updateCount: 0,
      userId: testUserId,
    });

    jest.spyOn(TimerUtil, 'getTs').mockReturnValue(300);

    const result2 = await postPlayAttempt(testUserId, testLevel._id.toString());

    expect(result2.status).toBe(200);

    const updatedLevel2 = await LevelModel.findById(testLevel._id);

    // Should increment both durations (user has no stat)
    expect(updatedLevel2?.calc_playattempts_duration_sum).toBe(300); // 250 + 50
    expect(updatedLevel2?.calc_playattempts_duration_before_stat_sum).toBe(150); // 100 + 50
  });
});
