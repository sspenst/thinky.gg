import AchievementCategory from '@root/constants/achievements/achievementCategory';
import AchievementType from '@root/constants/achievements/achievementType';
import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import { refreshAchievements } from '@root/helpers/refreshAchievements';
import { AchievementModel, LevelModel, UserConfigModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});

describe('helpers/refreshAchievements.ts', () => {
  test('test acclaimed level achievement', async () => {
    // create a level with a
    const [achievementsBefore] = await Promise.all([
      AchievementModel.find({ userId: TestId.USER }).lean(),
      LevelModel.updateOne({ _id: TestId.LEVEL }, { $set: { calc_reviews_score_laplace: 0.95 } })
    ]);

    expect(achievementsBefore.length).toBe(0);

    await refreshAchievements(DEFAULT_GAME_ID, new Types.ObjectId(TestId.USER), [AchievementCategory.CREATOR]);
    const achievementsAfter = await AchievementModel.find({ userId: TestId.USER }, {}, { sort: { type: 1 } }).lean();

    expect(achievementsAfter.length).toBe(2);

    expect(achievementsAfter[0].type).toBe(AchievementType.CREATOR_CREATED_1_HIGH_QUALITY_LEVEL);
    expect(achievementsAfter[1].type).toBe(AchievementType.CREATOR_CREATED_1_LEVEL);
  });

  test('test chapter achievements', async () => {
    // Clean up any existing achievements
    await AchievementModel.deleteMany({ userId: TestId.USER });

    // Test Chapter 1 completion (unlocked chapter 2)
    await UserConfigModel.updateOne(
      { userId: TestId.USER, gameId: DEFAULT_GAME_ID },
      { $set: { chapterUnlocked: 2 } },
      { upsert: true }
    );

    await refreshAchievements(DEFAULT_GAME_ID, new Types.ObjectId(TestId.USER), [AchievementCategory.PROGRESS]);
    let achievements = await AchievementModel.find({ userId: TestId.USER }).lean();

    expect(achievements.some(a => a.type === AchievementType.CHAPTER_1_COMPLETED)).toBe(true);
    expect(achievements.some(a => a.type === AchievementType.CHAPTER_2_COMPLETED)).toBe(false);
    expect(achievements.some(a => a.type === AchievementType.CHAPTER_3_COMPLETED)).toBe(false);

    // Test Chapter 2 completion (unlocked chapter 3)
    await UserConfigModel.updateOne(
      { userId: TestId.USER, gameId: DEFAULT_GAME_ID },
      { $set: { chapterUnlocked: 3 } }
    );

    await refreshAchievements(DEFAULT_GAME_ID, new Types.ObjectId(TestId.USER), [AchievementCategory.PROGRESS]);
    achievements = await AchievementModel.find({ userId: TestId.USER }).lean();

    expect(achievements.some(a => a.type === AchievementType.CHAPTER_1_COMPLETED)).toBe(true);
    expect(achievements.some(a => a.type === AchievementType.CHAPTER_2_COMPLETED)).toBe(true);
    expect(achievements.some(a => a.type === AchievementType.CHAPTER_3_COMPLETED)).toBe(false);

    // Test Chapter 3 completion (unlocked chapter 4)
    await UserConfigModel.updateOne(
      { userId: TestId.USER, gameId: DEFAULT_GAME_ID },
      { $set: { chapterUnlocked: 4 } }
    );

    await refreshAchievements(DEFAULT_GAME_ID, new Types.ObjectId(TestId.USER), [AchievementCategory.PROGRESS]);
    achievements = await AchievementModel.find({ userId: TestId.USER }).lean();

    expect(achievements.some(a => a.type === AchievementType.CHAPTER_1_COMPLETED)).toBe(true);
    expect(achievements.some(a => a.type === AchievementType.CHAPTER_2_COMPLETED)).toBe(true);
    expect(achievements.some(a => a.type === AchievementType.CHAPTER_3_COMPLETED)).toBe(true);
  });
});
