import { Types } from 'mongoose';
import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { PlayAttemptModel } from '@root/models/mongoose';
import { getStreaks } from '@root/pages/api/streak';
import { DEFAULT_GAME_ID } from '@root/constants/GameId';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(async () => {
  await PlayAttemptModel.deleteMany({});
  jest.restoreAllMocks();
});

describe('getStreaks', () => {
  const createPlayAttempt = (timestamp: number) => ({
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(TestId.USER),
    startTime: timestamp,
    endTime: timestamp + 100,
    levelId: new Types.ObjectId(TestId.LEVEL),
    gameId: DEFAULT_GAME_ID,
  });

  beforeEach(() => {
    // Mock to January 1, 2024 12:00:00 UTC
    const fixedDate = new Date('2024-01-01T12:00:00Z').getTime();
    jest.spyOn(Date, 'now').mockImplementation(() => fixedDate);
  });

  test('should return 0 streak when no play attempts exist', async () => {
    const result = await getStreaks(new Types.ObjectId(TestId.USER));
    expect(result.currentStreak).toBe(0);
    expect(result.calendar).toEqual([]);
  });

  test('should handle month boundary correctly', async () => {
    // Dec 30, Dec 31, Jan 1
    const timestamps = [
      new Date('2023-12-30T12:00:00Z').getTime() / 1000,
      new Date('2023-12-31T23:59:59Z').getTime() / 1000,
      new Date('2024-01-01T00:00:01Z').getTime() / 1000,
    ];

    await PlayAttemptModel.create(timestamps.map(createPlayAttempt));

    const result = await getStreaks(new Types.ObjectId(TestId.USER));
    expect(result.currentStreak).toBe(3);
    expect(result.calendar).toHaveLength(3);
  });

  test('should handle leap year correctly', async () => {
    // Feb 28, Feb 29, Mar 1 2024 (leap year)
    const timestamps = [
      new Date('2024-02-28T12:00:00Z').getTime() / 1000,
      new Date('2024-02-29T12:00:00Z').getTime() / 1000,
      new Date('2024-03-01T12:00:00Z').getTime() / 1000,
    ];

    // Set current date to March 1, 2024
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2024-03-01T12:00:00Z').getTime());

    await PlayAttemptModel.create(timestamps.map(createPlayAttempt));

    const result = await getStreaks(new Types.ObjectId(TestId.USER));
    expect(result.currentStreak).toBe(3);
    expect(result.calendar).toHaveLength(3);
  });

  test('should handle year boundary correctly', async () => {
    // Dec 31 2023, Jan 1 2024
    const timestamps = [
      new Date('2023-12-31T23:00:00Z').getTime() / 1000,
      new Date('2024-01-01T01:00:00Z').getTime() / 1000,
    ];

    await PlayAttemptModel.create(timestamps.map(createPlayAttempt));

    const result = await getStreaks(new Types.ObjectId(TestId.USER));
    expect(result.currentStreak).toBe(2);
    expect(result.calendar).toHaveLength(2);
  });

  test('should break streak across non-consecutive days', async () => {
    // Set current date to Dec 31, 2023
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2023-12-31T12:00:00Z').getTime());

    // Dec 29, Dec 31 (skipping Dec 30)
    const timestamps = [
      new Date('2023-12-29T12:00:00Z').getTime() / 1000,
      new Date('2023-12-31T12:00:00Z').getTime() / 1000,
    ];

    await PlayAttemptModel.create(timestamps.map(createPlayAttempt));

    const result = await getStreaks(new Types.ObjectId(TestId.USER));
    expect(result.currentStreak).toBe(1); // Only Dec 31 counts
    expect(result.calendar).toHaveLength(2);
  });

  test('should handle multiple plays on same day', async () => {
    // Two plays on Jan 1, 2024
    const timestamps = [
      new Date('2024-01-01T01:00:00Z').getTime() / 1000,
      new Date('2024-01-01T23:00:00Z').getTime() / 1000,
    ];

    await PlayAttemptModel.create(timestamps.map(createPlayAttempt));

    const result = await getStreaks(new Types.ObjectId(TestId.USER));
    expect(result.currentStreak).toBe(1);
    expect(result.calendar).toHaveLength(1);
  });
});
