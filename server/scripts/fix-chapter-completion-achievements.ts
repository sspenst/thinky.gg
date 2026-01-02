// run with ts-node -r tsconfig-paths/register --files server/scripts/fix-chapter-completion-achievements.ts
// This script fixes missing CHAPTER_COMPLETION achievements for users who completed chapters
// before the achievement system was properly implemented for chapter 3.

import AchievementCategory from '@root/constants/achievements/achievementCategory';
import AchievementType from '@root/constants/achievements/achievementType';
import { GameId } from '@root/constants/GameId';
import { refreshAchievements } from '@root/helpers/refreshAchievements';
import User from '@root/models/db/user';
import { AchievementModel, UserConfigModel, UserModel } from '@root/models/mongoose';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import * as readline from 'readline';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';

dotenv.config();

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

interface UserToFix {
  userId: string;
  gameId: GameId;
  chapterUnlocked: number;
  achievementsCount: number;
  missingAchievements: AchievementType[];
}

/**
 * Identifies users who should have chapter completion achievements but don't
 * Logic:
 * - If chapterUnlocked >= 2, should have CHAPTER_1_COMPLETED
 * - If chapterUnlocked >= 3, should have CHAPTER_2_COMPLETED
 * - If chapterUnlocked >= 4, should have CHAPTER_3_COMPLETED
 */
async function identifyUsersToFix(gameId: GameId, dryRun = true): Promise<UserToFix[]> {
  console.log(`\n🔍 Analyzing users for game: ${gameId}...`);

  // Get all users who have unlocked at least chapter 2 (meaning they completed chapter 1)
  const userConfigs = await UserConfigModel.find({
    gameId: gameId,
    chapterUnlocked: { $gte: 2 },
  }).lean();

  console.log(`Found ${userConfigs.length} users with chapterUnlocked >= 2`);

  const usersToFix: UserToFix[] = [];

  progressBar.start(userConfigs.length, 0);

  for (const config of userConfigs) {
    progressBar.increment();

    // Get all chapter completion achievements for this user
    const achievements = await AchievementModel.find({
      userId: config.userId,
      gameId: gameId,
      type: {
        $in: [
          AchievementType.CHAPTER_1_COMPLETED,
          AchievementType.CHAPTER_2_COMPLETED,
          AchievementType.CHAPTER_3_COMPLETED,
        ],
      },
    }).lean();

    const achievementTypes = new Set(achievements.map(a => a.type));
    const missingAchievements: AchievementType[] = [];

    // Check which achievements should exist but don't
    if (config.chapterUnlocked >= 2 && !achievementTypes.has(AchievementType.CHAPTER_1_COMPLETED)) {
      missingAchievements.push(AchievementType.CHAPTER_1_COMPLETED);
    }

    if (config.chapterUnlocked >= 3 && !achievementTypes.has(AchievementType.CHAPTER_2_COMPLETED)) {
      missingAchievements.push(AchievementType.CHAPTER_2_COMPLETED);
    }

    if (config.chapterUnlocked >= 4 && !achievementTypes.has(AchievementType.CHAPTER_3_COMPLETED)) {
      missingAchievements.push(AchievementType.CHAPTER_3_COMPLETED);
    }

    if (missingAchievements.length > 0) {
      usersToFix.push({
        userId: config.userId.toString(),
        gameId: gameId,
        chapterUnlocked: config.chapterUnlocked,
        achievementsCount: achievements.length,
        missingAchievements,
      });
    }
  }

  progressBar.stop();

  return usersToFix;
}

/**
 * Fixes missing achievements by calling refreshAchievements for affected users
 */
async function fixMissingAchievements(usersToFix: UserToFix[], dryRun = true) {
  if (usersToFix.length === 0) {
    console.log('\n✅ No users need fixing!');

    return;
  }

  console.log('\n📊 Summary of users to fix:');
  console.log(`Total users: ${usersToFix.length}`);

  // Group by what they're missing
  const missingChapter1 = usersToFix.filter(u => u.missingAchievements.includes(AchievementType.CHAPTER_1_COMPLETED));
  const missingChapter2 = usersToFix.filter(u => u.missingAchievements.includes(AchievementType.CHAPTER_2_COMPLETED));
  const missingChapter3 = usersToFix.filter(u => u.missingAchievements.includes(AchievementType.CHAPTER_3_COMPLETED));

  console.log(`  - Missing CHAPTER_1_COMPLETED: ${missingChapter1.length}`);
  console.log(`  - Missing CHAPTER_2_COMPLETED: ${missingChapter2.length}`);
  console.log(`  - Missing CHAPTER_3_COMPLETED: ${missingChapter3.length}`);

  // Group by chapterUnlocked level
  const byChapterUnlocked = usersToFix.reduce((acc, user) => {
    acc[user.chapterUnlocked] = (acc[user.chapterUnlocked] || 0) + 1;

    return acc;
  }, {} as Record<number, number>);

  console.log('\n📈 By chapterUnlocked:');
  Object.entries(byChapterUnlocked).sort(([a], [b]) => Number(a) - Number(b)).forEach(([level, count]) => {
    console.log(`  - Chapter ${level} unlocked: ${count} users`);
  });

  // Show all users to fix
  console.log('\n📋 All users to fix:');

  for (const user of usersToFix) {
    const userData = await UserModel.findById(user.userId).lean<User>();

    console.log(`  ${user.userId} (${userData?.name})`);
    console.log(`     Game: ${user.gameId}`);
    console.log(`     Chapter Unlocked: ${user.chapterUnlocked}`);
    console.log(`     Current Achievements: ${user.achievementsCount}`);
    console.log(`     Missing: ${user.missingAchievements.join(', ')}`);
  }

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made');
    console.log('Run with --apply to actually fix the achievements');

    return;
  }

  console.log('\n🔧 Starting to fix achievements...');

  progressBar.start(usersToFix.length, 0);

  let successCount = 0;
  let errorCount = 0;
  const errors: { userId: string; error: string }[] = [];

  for (const user of usersToFix) {
    try {
      progressBar.increment();

      // Use refreshAchievements to grant missing achievements
      await refreshAchievements(
        user.gameId,
        user.userId as any, // Types.ObjectId compatibility
        [AchievementCategory.CHAPTER_COMPLETION]
      );

      successCount++;
    } catch (error) {
      errorCount++;
      errors.push({
        userId: user.userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  progressBar.stop();

  console.log('\n✅ Fix completed!');
  console.log(`  - Success: ${successCount}`);
  console.log(`  - Errors: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(({ userId, error }, idx) => {
      console.log(`  ${idx + 1}. UserId ${userId}: ${error}`);
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const gameId = GameId.PATHOLOGY;

  console.log('🔧 Chapter Completion Achievement Fix Script');
  console.log('===========================================');
  console.log(`Game: ${gameId}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY CHANGES'}`);

  await dbConnect();

  try {
    const usersToFix = await identifyUsersToFix(gameId, dryRun);

    if (dryRun && usersToFix.length > 0) {
      // In dry run mode, ask for confirmation before showing we can proceed
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      await fixMissingAchievements(usersToFix, dryRun);

      console.log('\nTo apply these fixes, run:');
      console.log(`  ts-node -r tsconfig-paths/register --files server/scripts/fix-chapter-completion-achievements.ts --game=${gameId} --apply\n`);

      rl.close();
    } else {
      await fixMissingAchievements(usersToFix, dryRun);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await dbDisconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
