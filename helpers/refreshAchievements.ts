import { AchievementCategory, AchievementCategoryMapping } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import Discord from '@root/constants/discord';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import { getSolvesByDifficultyTable } from '@root/helpers/getSolvesByDifficultyTable';
import { createNewAchievement } from '@root/helpers/notificationHelper';
import { getDifficultyRollingSum } from '@root/helpers/playerRankHelper';
import Achievement from '@root/models/db/achievement';
import Level from '@root/models/db/level';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import MultiplayerProfile from '@root/models/db/multiplayerProfile';
import Review from '@root/models/db/review';
import User from '@root/models/db/user';
import { AchievementModel, LevelModel, MultiplayerMatchModel, MultiplayerProfileModel, ReviewModel, UserModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import queueDiscordWebhook from './discordWebhook';
import { getRecordsByUserId } from './getRecordsByUserId';

const AchievementCategoryFetch = {
  [AchievementCategory.USER]: async (gameId: GameId, userId: Types.ObjectId) => {
    const user = await UserModel.findById(userId).lean<User>();

    return { user: user };
  },
  [AchievementCategory.REVIEWER]: async (gameId: GameId, userId: Types.ObjectId) => {
    const reviewsCreated = await ReviewModel.find({ userId: userId, isDeleted: { $ne: true }, gameId: gameId }).lean<Review[]>();

    return { reviewsCreated: reviewsCreated };
  },
  [AchievementCategory.MULTIPLAYER]: async (gameId: GameId, userId: Types.ObjectId) => {
    const [userMatches, multiplayerProfile] = await Promise.all(
      [
        MultiplayerMatchModel.find({ players: userId, rated: true, gameId: gameId }, { players: 1, winners: 1, createdAt: 1, createdBy: 1, gameId: 1 }).lean<MultiplayerMatch[]>(),
        MultiplayerProfileModel.findOne({ userId: userId, gameId: gameId }).lean<MultiplayerProfile>(),
      ]
    );

    return { userMatches: userMatches, multiplayerProfile: multiplayerProfile };
  },
  [AchievementCategory.CREATOR]: async (gameId: GameId, userId: Types.ObjectId) => {
    const userCreatedLevels = await LevelModel.find(
      {
        userId: userId,
        isDraft: false,
        isDeleted: { $ne: true },
        gameId: gameId,

      },
      { score: 1, authorNote: 1, leastMoves: 1, ts: 1, calc_reviews_score_laplace: 1, calc_playattempts_just_beaten_count: 1, calc_playattempts_unique_users: 1, calc_reviews_count: 1 }).lean<Level[]>();

    return { levelsCreated: userCreatedLevels };
  },
  [AchievementCategory.SKILL]: async (gameId: GameId, userId: Types.ObjectId) => {
    const [levelsSolvedByDifficulty, records] = await Promise.all([
      getSolvesByDifficultyTable(gameId, userId),
      getRecordsByUserId(gameId, userId),
    ]);
    const rollingLevelSolvesSum = getDifficultyRollingSum(levelsSolvedByDifficulty);

    return { rollingLevelSolvesSum: rollingLevelSolvesSum, records: records };
  },
};

/**
*  Creates a new achievement for the user
 * @param userId
 * @return null if user not found
 */
export async function refreshAchievements(gameId: GameId, userId: Types.ObjectId, categories: AchievementCategory[]) {
  // it is more efficient to just grab all their achievements then to loop through and query each one if they have it
  const game = Games[gameId];
  const fetchPromises = [];

  for (const category of categories) {
    fetchPromises.push(AchievementCategoryFetch[category](gameId, userId));
  }

  const [user, neededDataArray, allAchievements] = await Promise.all([
    UserModel.findById(userId, { _id: 1, name: 1 }).lean<User>(), // TODO: this is a dup of query for USER achievement types and for any achievement without a discord notif... but maybe not a huge deal
    Promise.all(fetchPromises),
    AchievementModel.find({ userId: userId, gameId: gameId }, { type: 1, }).lean<Achievement[]>(),
  ]);
  // neededDataArray is an array of objects with unique keys. Let's combine into one big object
  const neededData = neededDataArray.reduce((acc, cur) => ({ ...acc, ...cur }), {});
  let achievementsCreated = 0;

  for (const category of categories) {
    const achievementsCreatedPromises = [];
    const categoryRulesTable = AchievementCategoryMapping[category];

    for (const achievementType in categoryRulesTable) {
      const achievementInfo = categoryRulesTable[achievementType];

      // check if the user already has the achievement and if so skip it (note we already have a unique index on userId and type)
      if (allAchievements.some((a: Achievement) => a.type === achievementType)) {
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (achievementInfo.unlocked(neededData as any)) {
        achievementsCreatedPromises.push(createNewAchievement(gameId, achievementType as AchievementType, userId, achievementsCreatedPromises.length > 0)); // for each category, only send one push notification

        if (achievementInfo.discordNotification) {
          // Should be "<User.name> just unlocked <Achievement.name> achievement!" where <User.name> is a link to the user's profile and <Achievement.name> is a link to the achievement's page
          const userName = user?.name;
          const userHref = game.baseUrl + '/profile/' + userName;
          const userLinkDiscord = `[${userName}](${userHref})`;
          const achievementHref = game.baseUrl + '/achievement/' + achievementType;
          const achievementLinkDiscord = `[${achievementInfo.name}](${achievementHref})`;
          // message should also include emoji
          const message = `**${game.displayName}** - ${userLinkDiscord} just unlocked the ${achievementLinkDiscord} ${achievementInfo.emoji} achievement!`;

          achievementsCreatedPromises.push(queueDiscordWebhook(Discord.General, message));
        }
      }
    }

    achievementsCreated += achievementsCreatedPromises.length;
    await Promise.all(achievementsCreatedPromises);
  }

  return achievementsCreated;
}
