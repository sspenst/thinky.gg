import AchievementCategory from '@root/constants/achievements/achievementCategory';
import AchievementType from '@root/constants/achievements/achievementType';
import { DEFAULT_GAME_ID, GameId } from '@root/constants/GameId';
import GraphType from '@root/constants/graphType';
import TestId from '@root/constants/testId';
import { refreshAchievements } from '@root/helpers/refreshAchievements';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { AchievementModel, GraphModel, LevelModel, UserConfigModel, UserModel } from '@root/models/mongoose';
import { processQueueMessages } from '@root/pages/api/internal-jobs/worker';
import socialShareHandler from '@root/pages/api/social-share/index';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
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

  test('test avatar upload achievement', async () => {
    // Clean up any existing achievements
    await AchievementModel.deleteMany({ userId: TestId.USER });

    // Test without avatar
    await UserModel.updateOne(
      { _id: TestId.USER },
      { $unset: { avatarUpdatedAt: 1 } }
    );

    await refreshAchievements(GameId.THINKY, new Types.ObjectId(TestId.USER), [AchievementCategory.SOCIAL]);
    let achievements = await AchievementModel.find({ userId: TestId.USER }).lean();

    expect(achievements.some(a => a.type === AchievementType.UPLOAD_AVATAR)).toBe(false);

    // Test with avatar
    await UserModel.updateOne(
      { _id: TestId.USER },
      { $set: { avatarUpdatedAt: Date.now() } }
    );

    await refreshAchievements(GameId.THINKY, new Types.ObjectId(TestId.USER), [AchievementCategory.SOCIAL]);
    achievements = await AchievementModel.find({ userId: TestId.USER }).lean();

    expect(achievements.some(a => a.type === AchievementType.UPLOAD_AVATAR)).toBe(true);
  });

  test('test bio update achievement', async () => {
    // Clean up any existing achievements
    await AchievementModel.deleteMany({ userId: TestId.USER });

    // Test without bio
    await UserModel.updateOne(
      { _id: TestId.USER },
      { $unset: { bio: 1 } }
    );

    await refreshAchievements(GameId.THINKY, new Types.ObjectId(TestId.USER), [AchievementCategory.SOCIAL]);
    let achievements = await AchievementModel.find({ userId: TestId.USER }).lean();

    expect(achievements.some(a => a.type === AchievementType.UPDATE_BIO)).toBe(false);

    // Test with empty bio
    await UserModel.updateOne(
      { _id: TestId.USER },
      { $set: { bio: '' } }
    );

    await refreshAchievements(GameId.THINKY, new Types.ObjectId(TestId.USER), [AchievementCategory.SOCIAL]);
    achievements = await AchievementModel.find({ userId: TestId.USER }).lean();

    expect(achievements.some(a => a.type === AchievementType.UPDATE_BIO)).toBe(false);

    // Test with non-empty bio
    await UserModel.updateOne(
      { _id: TestId.USER },
      { $set: { bio: 'This is my bio!' } }
    );

    await refreshAchievements(GameId.THINKY, new Types.ObjectId(TestId.USER), [AchievementCategory.SOCIAL]);
    achievements = await AchievementModel.find({ userId: TestId.USER }).lean();

    expect(achievements.some(a => a.type === AchievementType.UPDATE_BIO)).toBe(true);
  });

  describe('SOCIAL achievements', () => {
    beforeEach(async () => {
      await AchievementModel.deleteMany({ userId: TestId.USER });
      await GraphModel.deleteMany({});
    });

    test('should award SOCIAL_SHARE achievement when user shares a level', async () => {
      // Make API call to create a share
      await testApiHandler({
        pagesHandler: socialShareHandler as any,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'cookie': `token=${getTokenCookieValue(TestId.USER)}`,
            },
            body: JSON.stringify({
              platform: 'X',
              levelId: TestId.LEVEL_3,
            }),
          });

          expect(res.status).toBe(200);
          const response = await res.json();

          expect(response.success).toBe(true);
          expect(response.platform).toBe('X');
        },
      });

      // Process the queued achievement refresh
      await processQueueMessages();

      // Verify the share was created in the database
      const shareCount = await GraphModel.countDocuments({
        source: TestId.USER,
        type: GraphType.SHARE
      });

      expect(shareCount).toBe(1);

      // Verify achievement was awarded
      const socialAchievements = await AchievementModel.find({
        userId: TestId.USER,
        gameId: GameId.THINKY,
        type: AchievementType.SOCIAL_SHARE,
      });

      expect(socialAchievements).toHaveLength(1);
    });

    test('should not award SOCIAL_SHARE achievement when user has not shared', async () => {
      await refreshAchievements(GameId.THINKY, new Types.ObjectId(TestId.USER), [AchievementCategory.SOCIAL]);

      const socialAchievements = await AchievementModel.find({
        userId: TestId.USER,
        gameId: GameId.THINKY,
        type: AchievementType.SOCIAL_SHARE,
      });

      expect(socialAchievements).toHaveLength(0);
    });

    test('should count shares from multiple platforms', async () => {
      // Make API calls to create shares on different platforms for different levels
      await testApiHandler({
        pagesHandler: socialShareHandler as any,
        test: async ({ fetch }) => {
          // First share
          const res1 = await fetch({
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'cookie': `token=${getTokenCookieValue(TestId.USER)}`,
            },
            body: JSON.stringify({
              platform: 'X',
              levelId: TestId.LEVEL_3,
            }),
          });

          expect(res1.status).toBe(200);
          const response1 = await res1.json();

          expect(response1.success).toBe(true);
          expect(response1.platform).toBe('X');

          // Second share
          const res2 = await fetch({
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'cookie': `token=${getTokenCookieValue(TestId.USER)}`,
            },
            body: JSON.stringify({
              platform: 'Facebook',
              levelId: TestId.LEVEL_4,
            }),
          });

          expect(res2.status).toBe(200);
          const response2 = await res2.json();

          expect(response2.success).toBe(true);
          expect(response2.platform).toBe('Facebook');
        },
      });

      // Process the queued achievement refreshes
      await processQueueMessages();

      // Verify both shares were created
      const shareCount = await GraphModel.countDocuments({
        source: TestId.USER,
        type: GraphType.SHARE
      });

      expect(shareCount).toBe(2);

      // Verify achievement was awarded (should still only get one achievement even with multiple shares)
      const socialAchievements = await AchievementModel.find({
        userId: TestId.USER,
        gameId: GameId.THINKY,
        type: AchievementType.SOCIAL_SHARE,
      });

      expect(socialAchievements).toHaveLength(1);
    });
  });
});
