import { GameId } from '@root/constants/GameId';
import { GameType } from '@root/constants/Games';
import { getEnrichLevelsPipelineSteps, getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import { getRecordsByUserId } from '@root/helpers/getRecordsByUserId';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import User from '@root/models/db/user';
import mongoose, { PipelineStage, Types } from 'mongoose';
import { NextApiResponse } from 'next';
import { TimeFilter } from '../../../../../components/profile/profileInsights';
import Role from '../../../../../constants/role';
import { ValidEnum } from '../../../../../helpers/apiWrapper';
import { getSolveCountFactor } from '../../../../../helpers/getDifficultyEstimate';
import isPro from '../../../../../helpers/isPro';
import { ProStatsUserType } from '../../../../../hooks/useProStatsUser';
import cleanUser from '../../../../../lib/cleanUser';
import withAuth, { NextApiRequestWithAuth } from '../../../../../lib/withAuth';
import { LevelModel, PlayAttemptModel, StatModel, UserModel } from '../../../../../models/mongoose';
import { AttemptContext } from '../../../../../models/schemas/playAttemptSchema';

function getTimeFilterCutoff(timeFilter?: string): number | null {
  if (!timeFilter) return null;

  const now = Math.floor(Date.now() / 1000);

  switch (timeFilter) {
  case TimeFilter.WEEK:
    return now - (60 * 60 * 24 * 7);
  case TimeFilter.MONTH:
    return now - (60 * 60 * 24 * 30);
  case TimeFilter.YEAR:
    return now - (60 * 60 * 24 * 365);
  default:
    return null;
  }
}

async function getDifficultyDataComparisons(gameId: GameId, userId: string, timeFilter?: string) {
  const game = getGameFromId(gameId);
  const difficultyEstimate = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_completion_estimate' : 'calc_difficulty_estimate';
  const timeCutoff = getTimeFilterCutoff(timeFilter);

  const matchStage: any = {
    userId: new mongoose.Types.ObjectId(userId),
    complete: true,
    isDeleted: { $ne: true },
    gameId: gameId
  };

  if (timeCutoff) {
    matchStage.ts = { $gt: timeCutoff };
  }

  // Now run the full pipeline with appropriate threshold
  const difficultyData = await StatModel.aggregate([
    {
      $match: matchStage,
    },
    {
      $sort: { userId: 1, ts: -1 }
    },
    {
      $project: {
        levelId: 1,
        ts: 1,
      },
    },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'levelId',
        foreignField: '_id',
        as: 'level',
        pipeline: [
          {
            $match: {
              [difficultyEstimate]: { $exists: true, $gte: 0 },
              // Only include levels that are at least 7 days old (ts is in seconds)
              ts: { $lt: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) }
              // Removed calc_playattempts_unique_users filter - field appears to be missing
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              slug: 1,
              difficulty: `$${difficultyEstimate}`,
              calc_playattempts_duration_sum: 1,
              calc_playattempts_just_beaten_count: 1,
            }
          }
        ]
      },
    },
    {
      $unwind: '$level',
    },
    {
      $lookup: {
        from: PlayAttemptModel.collection.name,
        let: { levelId: '$level._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$levelId', '$$levelId'] },
                  { $eq: ['$userId', new mongoose.Types.ObjectId(userId)] },
                  { $ne: ['$startTime', '$endTime'] },
                ],
              },
              attemptContext: { $in: [AttemptContext.JUST_SOLVED, AttemptContext.UNSOLVED] },
            },
          },
          {
            $group: {
              _id: '$levelId',
              sumDuration: { $sum: { $subtract: ['$endTime', '$startTime'] } },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              levelId: '$_id',
              sumDuration: 1,
              count: 1,
            },
          },
        ],
        as: 'myplayattempts',
      },
    },
    {
      $unwind: {
        path: '$myplayattempts',
        preserveNullAndEmptyArrays: true,
      }
    },
    {
      $addFields: {
        otherPlayattemptsAverageDuration: {
          $cond: {
            if: { $gt: ['$level.calc_playattempts_just_beaten_count', 1] },
            then: { $divide: ['$level.calc_playattempts_duration_sum', '$level.calc_playattempts_just_beaten_count'] },
            else: null
          }
        }
      }
    },
    {
      $project: {
        _id: '$level._id',
        name: '$level.name',
        slug: '$level.slug',
        difficulty: '$level.difficulty',
        ts: 1,
        myPlayattemptsSumDuration: '$myplayattempts.sumDuration',
        otherPlayattemptsAverageDuration: 1,
        calc_playattempts_just_beaten_count: '$level.calc_playattempts_just_beaten_count',
        performanceRatio: {
          $cond: {
            if: {
              $and: [
                { $gt: ['$myplayattempts.sumDuration', 0] },
                { $gt: ['$otherPlayattemptsAverageDuration', 0] }
              ]
            },
            then: { $divide: ['$otherPlayattemptsAverageDuration', '$myplayattempts.sumDuration'] },
            else: null
          }
        },
        difficultyTier: {
          $switch: {
            branches: [
              { case: { $lt: ['$level.difficulty', 500] }, then: 'Easy' },
              { case: { $lt: ['$level.difficulty', 1000] }, then: 'Medium' },
              { case: { $lt: ['$level.difficulty', 1500] }, then: 'Hard' },
              { case: { $lt: ['$level.difficulty', 2000] }, then: 'Expert' },
              { case: { $gte: ['$level.difficulty', 2000] }, then: 'Master' },
            ],
            default: 'Unknown'
          }
        }
      },
    },
    // NOTE: Temporarily removing the final filter to see what we get
    // {
    //   $match: {
    //     myPlayattemptsSumDuration: { $gt: 0 },
    //     otherPlayattemptsAverageDuration: { $gt: 0 }
    //   }
    // }
  ]);

  return difficultyData;
}

async function getPlayLogForUsersCreatedLevels(gameId: GameId, reqUser: User, userId: string, timeFilter?: string) {
  const timeCutoff = getTimeFilterCutoff(timeFilter);
  const playLogsForUserCreatedLevels = await LevelModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isDraft: { $ne: true },
        isDeleted: { $ne: true },
        gameId: gameId,
      },
    },
    {
      $lookup: {
        from: StatModel.collection.name,
        localField: '_id',
        foreignField: 'levelId',
        as: 'stats',
      },
    },
    {
      $unwind: '$stats',
    },
    {
      $match: {
        'stats.complete': true,
        'stats.isDeleted': { $ne: true },
        ...(timeCutoff ? { 'stats.ts': { $gt: timeCutoff } } : {}),
      },
    },
    // order by stats.ts desc
    {
      $sort: {
        'stats.ts': -1,
      }
    },
    {
      $limit: 50,
    },
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: 'stats.userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $project: {
        _id: 0,
        levelId: '$_id',
        statTs: '$stats.ts',
        user: {
          ...USER_DEFAULT_PROJECTION
        },
      },
    },
    ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'user._id', lookupAs: 'user.config' }),
    // also get the level
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'levelId',
        foreignField: '_id',
        as: 'levelId',
        pipeline: [
          ...getEnrichLevelsPipelineSteps(reqUser) as PipelineStage.Lookup[],
        ]
      },
    },
    {
      $unwind: '$levelId',
    },
  ]);

  // cleanUser for each user
  playLogsForUserCreatedLevels.forEach((userAndStatTs) => {
    cleanUser(userAndStatTs.user);
  });

  return playLogsForUserCreatedLevels;
}

async function getMostSolvesForUserLevels(gameId: GameId, userId: string, timeFilter?: string) {
  const timeCutoff = getTimeFilterCutoff(timeFilter);
  /** get the users that have solved the most levels created by userId */
  const mostSolvesForUserLevels = await LevelModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isDraft: { $ne: true },
        isDeleted: { $ne: true },
        gameId: gameId,
      },
    },
    {
      $lookup: {
        from: StatModel.collection.name,
        localField: '_id',
        foreignField: 'levelId',
        as: 'stats',
      },
    },
    {
      $unwind: '$stats',
    },
    {
      $match: {
        'stats.complete': true,
        'stats.isDeleted': { $ne: true },
        ...(timeCutoff ? { 'stats.ts': { $gt: timeCutoff } } : {}),
      },
    },
    {
      $group: {
        _id: '$stats.userId',
        sum: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $project: {
        _id: 0,
        sum: 1,
        user: {
          ...USER_DEFAULT_PROJECTION
        },
      },
    },
    ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'user._id', lookupAs: 'user.config' }),
    {
      $sort: {
        sum: -1,
        'user.name': 1,
      },
    },
    {
      $limit: 100,
    },
  ]);

  // cleanUser for each user
  mostSolvesForUserLevels.forEach((userAndSum) => {
    cleanUser(userAndSum.user);
  });

  return mostSolvesForUserLevels;
}

async function getScoreHistory(gameId: GameId, userId: string, timeFilter?: string) {
  const timeCutoff = getTimeFilterCutoff(timeFilter);

  const matchStage: any = {
    userId: new mongoose.Types.ObjectId(userId),
    isDeleted: { $ne: true },
    complete: true,
    gameId: gameId,
  };

  if (timeCutoff) {
    matchStage.ts = { $gt: timeCutoff };
  }

  // OPTIMIZED: Optimize date grouping (MongoDB Atlas will use indexes automatically)
  const history = await StatModel.aggregate([
    {
      $match: matchStage,
    },
    // OPTIMIZATION: Group by date more efficiently using $dateFromParts
    {
      $group: {
        _id: {
          $dateFromParts: {
            year: { $year: { $toDate: { $multiply: ['$ts', 1000] } } },
            month: { $month: { $toDate: { $multiply: ['$ts', 1000] } } },
            day: { $dayOfMonth: { $toDate: { $multiply: ['$ts', 1000] } } }
          }
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: -1 },
    },
    // OPTIMIZATION: Server-side formatting
    {
      $project: {
        date: '$_id',
        sum: '$count',
      }
    }
  ]);

  return history;
}

export default withAuth({
  GET: {
    query: {
      type: ValidEnum(Object.values(ProStatsUserType)),
    }
  }
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const isAdmin = req.user?.roles?.includes(Role.ADMIN);
  const hasAccess = isPro(req.user) || isAdmin;

  if (!hasAccess) {
    return res.status(401).json({
      error: 'Not authorized',
    });
  }

  const { id: userId, type, timeFilter } = req.query as { id: string, type: string, timeFilter?: string };
  let scoreHistory, difficultyLevelsComparisons, mostSolvesForUserLevels, playLogForUserCreatedLevels, records;

  if (type === ProStatsUserType.DifficultyLevelsComparisons) {
    // Allow access if user is viewing their own data OR if they're an admin
    if (userId !== req.user._id.toString() && !isAdmin) {
      return res.status(401).json({
        error: 'Not authorized',
      });
    }

    difficultyLevelsComparisons = await getDifficultyDataComparisons(req.gameId, userId, timeFilter);
  } else if (type === ProStatsUserType.ScoreHistory) {
    scoreHistory = await getScoreHistory(req.gameId, userId, timeFilter);
  } else if (type === ProStatsUserType.MostSolvesForUserLevels) {
    mostSolvesForUserLevels = await getMostSolvesForUserLevels(req.gameId, userId, timeFilter);
  } else if (type === ProStatsUserType.PlayLogForUserCreatedLevels) {
    playLogForUserCreatedLevels = await getPlayLogForUsersCreatedLevels(req.gameId, req.user, userId, timeFilter);
  } else if (type === ProStatsUserType.Records) {
    records = await getRecordsByUserId(req.gameId, new Types.ObjectId(userId), req.user);
  }

  const response = {
    [ProStatsUserType.ScoreHistory]: scoreHistory,
    [ProStatsUserType.DifficultyLevelsComparisons]: difficultyLevelsComparisons,
    [ProStatsUserType.MostSolvesForUserLevels]: mostSolvesForUserLevels,
    [ProStatsUserType.PlayLogForUserCreatedLevels]: playLogForUserCreatedLevels,
    [ProStatsUserType.Records]: records,
  };

  return res.status(200).json(response);
});
