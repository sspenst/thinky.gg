import AchievementCategory from '@root/constants/achievements/achievementCategory';
import { AchievementCategoryMapping } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import DiscordChannel from '@root/constants/discordChannel';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import GraphType from '@root/constants/graphType';
import { getSolvesByDifficultyTable } from '@root/helpers/getSolvesByDifficultyTable';
import { createNewAchievement } from '@root/helpers/notificationHelper';
import { getDifficultyRollingSum } from '@root/helpers/playerRankHelper';
import Achievement from '@root/models/db/achievement';
import Comment from '@root/models/db/comment';
import Level from '@root/models/db/level';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import MultiplayerProfile from '@root/models/db/multiplayerProfile';
import User from '@root/models/db/user';
import { AchievementModel, CollectionModel, CommentModel, GraphModel, LevelModel, MultiplayerMatchModel, MultiplayerProfileModel, ReviewModel, UserConfigModel, UserModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import queueDiscordWebhook from './discordWebhook';
import { getRecordsByUserId } from './getRecordsByUserId';

const AchievementCategoryFetch = {
  // no game ID as this is a global
  [AchievementCategory.SOCIAL]: async (_gameId: GameId, userId: Types.ObjectId) => {
    const [commentCount, welcomeComments, socialShareCount, user] = await Promise.all([
      CommentModel.countDocuments({
        author: userId,
        deletedAt: null,
        target: { $ne: userId }
      }),
      CommentModel.find({
        author: userId,
        deletedAt: null,
        target: { $ne: userId },
        text: { $regex: /welcome/i },
      }).populate('target').lean<Comment[]>(),
      GraphModel.countDocuments({ source: userId, type: GraphType.SHARE }),
      UserModel.findById(userId).select('+bio +avatarUpdatedAt').lean<User>()
    ]);

    const hasWelcomed = welcomeComments.some((comment) => {
      const targetUser = comment.target as unknown as User;

      if (!targetUser?.ts) {
        return false;
      }

      // if the comment was made in the first 24 hrs since account creation
      return comment.createdAt.getTime() - 1000 * targetUser.ts < 24 * 60 * 60 * 1000;
    });

    return { commentCount: commentCount, hasWelcomed: hasWelcomed, hasSharedToSocial: socialShareCount > 0, user: user };
  },
  // no game ID as this is a global for Thinky platform features
  [AchievementCategory.FEATURE_EXPLORER]: async (_gameId: GameId, userId: Types.ObjectId) => {
    const [hasAddedLevelToCollection, user] = await Promise.all([
      CollectionModel.exists({ userId: userId, levels: { $exists: true, $ne: [] } }),
      UserModel.findById(userId).select('+bio +avatarUpdatedAt').lean<User>()
    ]);

    return { hasAddedLevelToCollection: !!hasAddedLevelToCollection, user: user };
  },
  [AchievementCategory.PROGRESS]: async (gameId: GameId, userId: Types.ObjectId) => {
    const userConfig = await UserConfigModel.findOne({ userId: userId, gameId: gameId }).lean<User>();

    return { userConfig: userConfig };
  },
  [AchievementCategory.REVIEWER]: async (gameId: GameId, userId: Types.ObjectId) => {
    const reviewsCreatedCount = await ReviewModel.countDocuments({ userId: userId, isDeleted: { $ne: true }, gameId: gameId });

    return { reviewsCreatedCount: reviewsCreatedCount };
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
  [AchievementCategory.CHAPTER_COMPLETION]: async (gameId: GameId, userId: Types.ObjectId) => {
    const userConfig = await UserConfigModel.findOne({ userId: userId, gameId: gameId }).lean<User>();

    return { userConfig: userConfig };
  },
};

/**
*  Creates a new achievement for the user
 * @param userId
 * @return null if user not found
 */
export async function refreshAchievements(pGameId: GameId, userId: Types.ObjectId, categories: AchievementCategory[]) {
  let gameIds = [pGameId];

  if (pGameId === GameId.THINKY) {
    gameIds = [GameId.PATHOLOGY, GameId.SOKOPATH, GameId.THINKY];
  }

  const achievementsCreatedMap: Record<GameId, number> = {
    [GameId.THINKY]: 0,
    [GameId.PATHOLOGY]: 0,
    [GameId.SOKOPATH]: 0,
  };

  for (const gameId of gameIds) {
  // it is more efficient to just grab all their achievements then to loop through and query each one if they have it
    const game = Games[gameId];
    const fetchPromises = [];
    const adjustedCategories = categories.filter((category) => game.achievementCategories.includes(category));

    for (const category of adjustedCategories) {
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

    for (const category of adjustedCategories) {
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
          // For global achievements (SOCIAL, FEATURE_EXPLORER), always use GameId.THINKY
          const achievementGameId = (category === AchievementCategory.SOCIAL || category === AchievementCategory.FEATURE_EXPLORER) ? GameId.THINKY : gameId;

          achievementsCreatedPromises.push(createNewAchievement(achievementGameId, achievementType as AchievementType, userId, achievementsCreatedPromises.length > 0)); // for each category, only send one push notification

          if (achievementInfo.discordNotification) {
          // Should be "<User.name> just unlocked <Achievement.name> achievement!" where <User.name> is a link to the user's profile and <Achievement.name> is a link to the achievement's page
            const userName = user?.name;
            const userLinkDiscord = `${userName}`;
            const achievementHref = game.baseUrl + '/achievement/' + achievementType;
            const achievementLinkDiscord = `[${achievementInfo.name}](${achievementHref})`;
            const message = `${userLinkDiscord} just unlocked the ${achievementLinkDiscord} ${achievementInfo.emoji} achievement!`;
            const discordChannel = game.id === GameId.SOKOPATH ? DiscordChannel.Sokopath : DiscordChannel.Pathology;

            // Pass the username for potential Discord mention lookup
            achievementsCreatedPromises.push(queueDiscordWebhook(discordChannel, message, undefined, userName ? [userName] : []));
          }
        }
      }

      achievementsCreated += achievementsCreatedPromises.length;
      achievementsCreatedMap[gameId] = achievementsCreated;
      await Promise.all(achievementsCreatedPromises);
    }
  }

  return achievementsCreatedMap;
}
