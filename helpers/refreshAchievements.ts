import { AchievementCategory, AchievementCategoryMapping } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import { getCompletionByDifficultyTable } from '@root/helpers/getCompletionByDifficultyTable';
import { createNewAchievement } from '@root/helpers/notificationHelper';
import { getDifficultyRollingSum } from '@root/helpers/playerRankHelper';
import Achievement from '@root/models/db/achievement';
import Level from '@root/models/db/level';
import Review from '@root/models/db/review';
import User from '@root/models/db/user';
import { AchievementModel, LevelModel, MultiplayerMatchModel, MultiplayerProfileModel, ReviewModel, UserModel } from '@root/models/mongoose';
import { Types } from 'mongoose';

const AchievementCategoryFetch = {
  [AchievementCategory.USER]: async (userId: Types.ObjectId) => {
    const user = await UserModel.findById<User>(userId, {}, { lean: true });

    return { user: user };
  },
  [AchievementCategory.REVIEWER]: async (userId: Types.ObjectId) => {
    const reviewsCreated = await ReviewModel.find<Review>({ userId: userId, isDeleted: { $ne: true } }, {}, { lean: true });

    return { reviewsCreated: reviewsCreated };
  },
  [AchievementCategory.MULTIPLAYER]: async (userId: Types.ObjectId) => {
    const [userMatches, multiplayerProfile] = await Promise.all(
      [
        MultiplayerMatchModel.find({ players: userId, rated: true }, { players: 1, winners: 1, createdAt: 1, createdBy: 1 }, { lean: true }),
        MultiplayerProfileModel.findOne({ userId: userId }, {}, { lean: true })
      ]
    );

    return { userMatches: userMatches, multiplayerProfile: multiplayerProfile };
  },
  [AchievementCategory.CREATOR]: async (userId: Types.ObjectId) => {
    const userCreatedLevels = await LevelModel.find<Level>(
      {
        userId: userId, isDraft: false, isDeleted: { $ne: true },
      }, { score: 1, authorNote: 1, leastMoves: 1, ts: 1, calc_reviews_score_laplace: 1, calc_playattempts_just_beaten_count: 1, calc_playattempts_unique_users: 1, calc_reviews_count: 1 },
      { lean: true });

    return { levelsCreated: userCreatedLevels };
  },
  [AchievementCategory.LEVEL_COMPLETION]: async (userId: Types.ObjectId) => {
    const levelsCompletedByDifficulty = await getCompletionByDifficultyTable(userId);
    const rollingLevelCompletionSum = getDifficultyRollingSum(levelsCompletedByDifficulty);

    return { rollingLevelCompletionSum: rollingLevelCompletionSum };
  },
};

/**
*  Creates a new achievement for the user
 * @param userId
 * @return null if user not found
 */
export async function refreshAchievements(userId: Types.ObjectId, categories: AchievementCategory[]) {
  // it is more efficient to just grab all their achievements then to loop through and query each one if they have it

  const fetchPromises = [];

  for (const category of categories) {
    fetchPromises.push(AchievementCategoryFetch[category](userId));
  }

  const [neededDataArray, allAchievements] = await Promise.all([
    Promise.all(fetchPromises),
    AchievementModel.find<Achievement>({ userId: userId }, { type: 1, }, { lean: true }),
  ]);
    // neededDataArray is an array of objects with unique keys. Let's combine into one big object
  const neededData = neededDataArray.reduce((acc, cur) => ({ ...acc, ...cur }), {});
  const achievementsCreatedPromises = [];

  for (const category of categories) {
    const categoryRulesTable = AchievementCategoryMapping[category];

    for (const achievementType in categoryRulesTable) {
      const achievementInfo = categoryRulesTable[achievementType];

      // check if the user already has the achievement and if so skip it (note we already have a unique index on userId and type)
      if (allAchievements.some((a: Achievement) => a.type === achievementType)) {
        continue;
      }

      // TODO: maybe there is a more proper way to do this so i can remove the as any...
      if (achievementInfo.unlocked(neededData as any)) {
        achievementsCreatedPromises.push(createNewAchievement(achievementType as AchievementType, userId, achievementsCreatedPromises.length > 3));
      }
    }
  }

  await Promise.all(achievementsCreatedPromises);

  return achievementsCreatedPromises;
}
