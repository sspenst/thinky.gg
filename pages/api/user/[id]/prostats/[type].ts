import { GameId } from '@root/constants/GameId';
import { GameType } from '@root/constants/Games';
import { getEnrichLevelsPipelineSteps, getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import { getRecordsByUserId } from '@root/helpers/getRecordsByUserId';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import User from '@root/models/db/user';
import mongoose, { PipelineStage, Types } from 'mongoose';
import { NextApiResponse } from 'next';
import { ValidEnum } from '../../../../../helpers/apiWrapper';
import { getSolveCountFactor } from '../../../../../helpers/getDifficultyEstimate';
import isPro from '../../../../../helpers/isPro';
import { ProStatsUserType } from '../../../../../hooks/useProStatsUser';
import cleanUser from '../../../../../lib/cleanUser';
import withAuth, { NextApiRequestWithAuth } from '../../../../../lib/withAuth';
import { LevelModel, PlayAttemptModel, StatModel, UserModel } from '../../../../../models/mongoose';
import { AttemptContext } from '../../../../../models/schemas/playAttemptSchema';

async function getDifficultyDataComparisons(gameId: GameId, userId: string) {
  /** TODO: Store this in a K/V store with an expiration of like 1 day... */
  const game = getGameFromId(gameId);
  const difficultyEstimate = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_completion_estimate' : 'calc_difficulty_estimate';
  const difficultyData = await StatModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        complete: true,
        isDeleted: { $ne: true },
        ts: { $gt: Math.floor(Date.now() / 1000) - (60 * 60 * 24 * 30 * 6) },
        gameId: gameId
      },
    },
    {
      $sort: {
        ts: -1,
      }
    },
    {
      $project: {
        _id: 0,
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
        // match where calc_playattempts_unique_users >= 10
        pipeline: [
          {
            $match: {
              [difficultyEstimate]: { $gte: 0 },
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              calc_difficulty_completion_estimate: 1,
              calc_difficulty_estimate: 1,
              calc_playattempts_just_beaten_count: 1,
              slug: 1
            }
          }
        ]
      },
    },
    {
      $unwind: '$level',
    },
    {
      $limit: 500
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

                ],
              },
            },
          },
          {
            $match: {
              attemptContext: AttemptContext.JUST_SOLVED,
            },
          },
          {
            $group: {
              _id: '$userId',
            },
          },
        ],
        as: 'players_with_just_solved_playattempt',
      }
    },
    {
      // convert players_with_just_solved_playattempt to an array of ids
      $addFields: {
        players_with_just_solved_playattempt: {
          $map: {
            input: '$players_with_just_solved_playattempt',
            as: 'player',
            in: '$$player._id',
          },
        },
      }
    },
    // remove my own playattempt id from players_with_just_solved_playattempt
    {
      $addFields: {
        players_with_just_solved_playattempt: {
          $filter: {
            input: '$players_with_just_solved_playattempt',
            as: 'player',
            cond: { $ne: ['$$player', new mongoose.Types.ObjectId(userId)] },
          },
        },
      }
    },
    {
      $project: {
        _id: '$level._id',
        name: '$level.name',
        difficulty: '$level.' + difficultyEstimate,
        ts: 1,
        slug: '$level.slug',
        calc_playattempts_just_beaten_count: '$level.calc_playattempts_just_beaten_count',
        calc_playattempts_duration_sum: '$level.calc_playattempts_duration_sum',
        players_with_just_solved_playattempt: 1,
      },
    },
    {
      $lookup: {
        from: PlayAttemptModel.collection.name,
        let: { levelId: '$_id', players_with_just_solved_playattempt: '$players_with_just_solved_playattempt' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$levelId', '$$levelId'] },
                  // check where user is in players_with_just_solved_playattempt
                  { $in: ['$userId', '$$players_with_just_solved_playattempt'] },
                  { $ne: ['$startTime', '$endTime'] },

                ],
              },
            },
          },
          {
            $match: {
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
        as: 'otherplayattempts',
      },
    },
    {
      $addFields: {
        otherplayattempts: {
          $arrayElemAt: ['$otherplayattempts', 0],
        },
      },
    },
    {
      $lookup: {
        from: PlayAttemptModel.collection.name,
        let: { levelId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$levelId', '$$levelId'] },
                  { $eq: ['$userId', new mongoose.Types.ObjectId(userId)] },
                  // where startTime != endTime
                  { $ne: ['$startTime', '$endTime'] },
                ],
              },
            },
          },
          {
            $match: {
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
      $project: {
        _id: 1,
        other_calc_playattempts_just_beaten_count: { $size: '$players_with_just_solved_playattempt' },
        myPlayattemptsSumDuration: '$myplayattempts.sumDuration',
        name: 1,
        difficulty: 1,
        slug: 1,
        ts: 1,
        calc_playattempts_just_beaten_count: 1,
        otherPlayattemptsAverageDuration: { $divide: ['$otherplayattempts.sumDuration', { $size: '$players_with_just_solved_playattempt' }] },
        calc_playattempts_duration_sum: 1,
      },
    },
  ]);

  // loop through all the levels and manipulate difficulty
  for (let i = 0; i < difficultyData.length; i++) {
    const level = difficultyData[i];
    const solveCount = !level.calc_playattempts_just_beaten_count ? 1 : level.calc_playattempts_just_beaten_count;

    if (level.averageDuration) {
      level.difficultyAdjusted = level.difficulty / getSolveCountFactor(solveCount);
    }
  }

  return difficultyData;
}

async function getPlayLogForUsersCreatedLevels(gameId: GameId, reqUser: User, userId: string) {
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

async function getMostSolvesForUserLevels(gameId: GameId, userId: string) {
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

async function getScoreHistory(gameId: GameId, userId: string) {
  const history = await StatModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isDeleted: { $ne: true },
        complete: true,
        // where ts > 6 months ago
        ts: { $gt: Math.floor(Date.now() / 1000) - (60 * 60 * 24 * 30 * 6) },
        gameId: gameId,
      },
    },
    {
      $project: {
        _id: 0,
        date: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $toDate: { $multiply: ['$ts', 1000] } },
          },
        },
      },
    },
    {
      $group: {
        _id: '$date',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: -1 },
    },
    {
      $project: {
        // convert date to ISODate
        date: { $toDate: { $concat: ['$_id', 'T00:00:00Z'] } },
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
  if (!isPro(req.user)) {
    return res.status(401).json({
      error: 'Not authorized',
    });
  }

  const { id: userId, type } = req.query as { id: string, type: string };
  let scoreHistory, difficultyLevelsComparisons, mostSolvesForUserLevels, playLogForUserCreatedLevels, records;

  if (type === ProStatsUserType.DifficultyLevelsComparisons) {
    if (userId !== req.user._id.toString()) {
      return res.status(401).json({
        error: 'Not authorized',
      });
    }

    difficultyLevelsComparisons = await getDifficultyDataComparisons(req.gameId, userId);
  } else if (type === ProStatsUserType.ScoreHistory) {
    scoreHistory = await getScoreHistory(req.gameId, userId);
  } else if (type === ProStatsUserType.MostSolvesForUserLevels) {
    mostSolvesForUserLevels = await getMostSolvesForUserLevels(req.gameId, userId);
  } else if (type === ProStatsUserType.PlayLogForUserCreatedLevels) {
    playLogForUserCreatedLevels = await getPlayLogForUsersCreatedLevels(req.gameId, req.user, userId);
  } else if (type === ProStatsUserType.Records) {
    records = await getRecordsByUserId(req.gameId, new Types.ObjectId(userId), req.user);
  }

  return res.status(200).json({
    [ProStatsUserType.ScoreHistory]: scoreHistory,
    [ProStatsUserType.DifficultyLevelsComparisons]: difficultyLevelsComparisons,
    [ProStatsUserType.MostSolvesForUserLevels]: mostSolvesForUserLevels,
    [ProStatsUserType.PlayLogForUserCreatedLevels]: playLogForUserCreatedLevels,
    [ProStatsUserType.Records]: records,
  });
});
