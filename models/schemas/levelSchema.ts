import { GameId } from '@root/constants/GameId';
import mongoose, { QueryOptions, Types } from 'mongoose';
import getDifficultyEstimate, { getDifficultyCompletionEstimate } from '../../helpers/getDifficultyEstimate';
import Level from '../db/level';
import Stat from '../db/stat';
import { LevelModel, PlayAttemptModel, ReviewModel, StatModel } from '../mongoose';
import { AttemptContext } from './playAttemptSchema';

const LevelSchema = new mongoose.Schema<Level>(
  {
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    archivedTs: {
      type: Number,
    },
    authorNote: {
      type: String,
      maxlength: 1024 * 5, // 5 kb limit seems reasonable
    },
    calc_difficulty_completion_estimate: {
      type: Number,
      default: -1
    },
    calc_difficulty_estimate: {
      type: Number,
      default: -1,
    },
    calc_playattempts_duration_before_stat_sum: {
      type: Number,
      default: 0,
    },
    calc_playattempts_duration_sum: {
      type: Number,
      default: 0,
    },
    calc_playattempts_just_beaten_count: {
      type: Number,
      default: 0,
    },
    calc_playattempts_unique_users: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    calc_reviews_count: {
      type: Number,
      required: false,
      default: 0
    },
    calc_reviews_score_avg: {
      type: Number,
      required: false,
      default: 0.00
    },
    calc_reviews_score_laplace: {
      type: Number,
      required: false,
      default: 0.67
    },
    calc_stats_completed_count: {
      type: Number,
      required: false,
      default: 0
    },
    calc_stats_players_beaten: {
      type: Number,
      required: false,
      default: 0
    },
    collaborators: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    // https://github.com/sspenst/thinky.gg/wiki/Level-data-format
    data: {
      type: String,
      required: true,
      minLength: 1,
      maxlength: 40 * 40 + 39,
    },
    gameId: {
      type: String,
      enum: GameId,
      required: true,
    },
    height: {
      type: Number,
      required: true,
      min: 1,
      max: 40,
    },
    isDeleted: {
      type: Boolean,
    },
    isDraft: {
      type: Boolean,
      required: true,
    },
    isRanked: {
      type: Boolean,
      required: true,
    },
    leastMoves: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 50,
    },
    slug: {
      type: String,
      required: true,
    },
    ts: {
      type: Number,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    width: {
      type: Number,
      required: true,
      min: 1,
      max: 40,
    },
  },
  {
    collation: {
      locale: 'en_US',
      strength: 2,
    },
  },
);

LevelSchema.index({ slug: 1, gameId: 1 }, { unique: true });
LevelSchema.index({ name: 1 });
LevelSchema.index({ userId: 1, name: 1 });
LevelSchema.index({ ts: -1 });
LevelSchema.index({ isDraft: 1 });
LevelSchema.index({ isRanked: 1 });
LevelSchema.index({ leastMoves: 1 });
LevelSchema.index({ calc_difficulty_estimate: 1 });
LevelSchema.index({ calc_playattempts_duration_sum: 1 });
LevelSchema.index({ calc_playattempts_just_beaten_count: 1 });
LevelSchema.index({ calc_playattempts_unique_users: 1 });
LevelSchema.index({ calc_reviews_count: 1 });
LevelSchema.index({ calc_reviews_score_avg: 1 });
LevelSchema.index({ calc_reviews_score_laplace: 1 });
LevelSchema.index({ calc_stats_players_beaten: 1 });

async function calcReviews(lvl: Level) {
  // get average score for reviews with levelId: id
  const reviews = await ReviewModel.find({
    levelId: lvl._id,
  });

  let totalUp = 0;
  let totalVotes = 0;

  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];

    if (review.score !== 0) {
      // maps to 0, 0.25, 0.5, 0.75, 1
      const incr = (review.score - 1) / 4;

      totalUp += incr;
      totalVotes++;
    }
  }

  // priors
  const A = 2.0;
  const B = 3.0;

  const reviewsScoreSum = reviews.reduce((acc, review) => acc + review.score, 0);
  const reviewsScoreAvg = totalVotes > 0 ? reviewsScoreSum / totalVotes : 0;
  const reviewsScoreLaplace = (totalUp + A) / (totalVotes + B);

  return {
    calc_reviews_count: reviews.length,
    calc_reviews_score_avg: reviewsScoreAvg,
    calc_reviews_score_laplace: reviewsScoreLaplace,
  } as Partial<Level>;
}

async function calcStats(level: Level, options?: QueryOptions) {
  const stats = await StatModel.find({
    levelId: level._id,
  }, 'moves', options).lean<Stat[]>();

  return {
    calc_stats_completed_count: stats.length,
    calc_stats_players_beaten: stats.filter((stat) => stat.moves === level.leastMoves).length,
  } as Partial<Level>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function calcPlayAttempts(levelId: Types.ObjectId, options: any = {}) {
  const level = await LevelModel.findById(levelId, 'leastMoves userId', options) as Level;

  const [stats, playAttemptCompletionAgg, playAttemptAgg] = await Promise.all([
    calcStats(level, options),
    PlayAttemptModel.aggregate([
      {
        $match: {
          levelId: levelId,
        }
      },
      // group by userId
      {
        $group: {
          _id: '$userId',
          playAttempts: {
            $push: '$$ROOT',
          },
        }
      },
      // for each group, look up the corresponding stat model based on userId and levelId
      {
        $lookup: {
          from: StatModel.collection.name,
          let: {
            userId: '$_id',
            levelId: levelId,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ['$userId', '$$userId'],
                    },
                    {
                      $eq: ['$levelId', '$$levelId'],
                    },
                  ],
                },
              },
            },
          ],
          as: 'stat',
        }
      },
      {
        $unwind: {
          path: '$stat',
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $addFields: {
          createdAt: {
            $cond: [
              '$stat',
              {
                $floor: {
                  $divide: [
                    { $toLong: '$stat.createdAt' },
                    1000
                  ]
                }
              },
              Number.MAX_SAFE_INTEGER,
            ]
          }
        }
      },
      // filter out playattempts with startTime > createdAt
      {
        $addFields: {
          playAttempts: {
            $filter: {
              input: '$playAttempts',
              as: 'playAttempt',
              cond: {
                $lt: ['$$playAttempt.startTime', '$createdAt'],
              }
            }
          }
        }
      },
      // sum min(endTime, createdAt) - startTime for each playAttempt
      {
        $addFields: {
          playAttempts: {
            $map: {
              input: '$playAttempts',
              as: 'playAttempt',
              in: {
                $subtract: [
                  {
                    $min: ['$createdAt', '$$playAttempt.endTime'],
                  },
                  '$$playAttempt.startTime',
                ],
              },
            },
          },
        },
      },
      // sum all playattempts per user
      {
        $addFields: {
          playtimePerUserBeforeCompletion: {
            $reduce: {
              input: '$playAttempts',
              initialValue: 0,
              in: {
                $add: ['$$value', '$$this'],
              },
            },
          },
        },
      },
      // filter users with 0 playtime
      {
        $match: {
          playtimePerUserBeforeCompletion: {
            $gt: 0,
          },
        },
      },
      {
        $group: {
          _id: null,
          calcPlayattemptsDurationBeforeStatSum: {
            $sum: '$playtimePerUserBeforeCompletion',
          },
        },
      },
    ], options),
    PlayAttemptModel.aggregate([
      {
        $match: {
          levelId: levelId,
        }
      },
      {
        $facet: {
          'calcPlayAttemptsJustBeatenCount': [
            { $match: { attemptContext: AttemptContext.JUST_SOLVED } },
            { $count: 'total' }
          ],
          'calcPlayAttemptsDurationSum': [
            { $match: { attemptContext: { $ne: AttemptContext.SOLVED } } },
            { $group: { _id: null, totalDuration: { $sum: { $subtract: ['$endTime', '$startTime'] } } } }
          ],
          'uniqueUsersList': [
            {
              $match: {
                $or: [
                  {
                    $and: [
                      {
                        $expr: {
                          $gt: [
                            {
                              $subtract: ['$endTime', '$startTime']
                            },
                            0
                          ]
                        }
                      },
                      {
                        attemptContext: AttemptContext.UNSOLVED,
                      }
                    ],
                  },
                  {
                    attemptContext: AttemptContext.JUST_SOLVED,
                  },
                ],
              },
            },
            {
              $group: {
                _id: null,
                userId: {
                  $addToSet: '$userId',
                },
              }
            },
            {
              $unwind: {
                path: '$userId',
                preserveNullAndEmptyArrays: true,
              },
            },
          ]
        }
      },
      {
        $project: {
          calcPlayAttemptsJustBeatenCount: { $arrayElemAt: ['$calcPlayAttemptsJustBeatenCount.total', 0] },
          calcPlayAttemptsDurationSum: { $arrayElemAt: ['$calcPlayAttemptsDurationSum.totalDuration', 0] },
          uniqueUsersList: '$uniqueUsersList',
        }
      }
    ], options),
  ]);

  const calcPlayattemptsDurationBeforeStatSum = playAttemptCompletionAgg[0]?.calcPlayattemptsDurationBeforeStatSum ?? 0;
  const calcPlayAttemptsDurationSum = playAttemptAgg[0]?.calcPlayAttemptsDurationSum ?? 0;
  const calcPlayAttemptsJustBeatenCount = playAttemptAgg[0]?.calcPlayAttemptsJustBeatenCount ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calcPlayAttemptsUniqueUsers = (playAttemptAgg[0]?.uniqueUsersList ?? []).map((u: any) => u?.userId.toString());

  const update = {
    calc_playattempts_duration_before_stat_sum: calcPlayattemptsDurationBeforeStatSum,
    calc_playattempts_duration_sum: calcPlayAttemptsDurationSum,
    calc_playattempts_just_beaten_count: calcPlayAttemptsJustBeatenCount,
    calc_playattempts_unique_users: calcPlayAttemptsUniqueUsers,
    calc_stats_completed_count: stats.calc_stats_completed_count,
    calc_stats_players_beaten: stats.calc_stats_players_beaten,
  } as Partial<Level>;

  const uniqueUsersCount = calcPlayAttemptsUniqueUsers.length;
  const uniqueUsersCountExcludingAuthor = calcPlayAttemptsUniqueUsers.filter((u: string) => u !== level.userId.toString()).length;

  update.calc_difficulty_completion_estimate = getDifficultyCompletionEstimate(update, uniqueUsersCountExcludingAuthor);
  update.calc_difficulty_estimate = getDifficultyEstimate(update, uniqueUsersCount);

  return await LevelModel.findByIdAndUpdate<Level>(levelId, {
    $set: update,
  }, { new: true, ...options });
}

export async function refreshIndexCalcs(levelId: Types.ObjectId) {
  const level = await LevelModel.findById(levelId);

  const [reviews, stats] = await Promise.all([calcReviews(level), calcStats(level)]);

  // save level
  const update = {
    ...reviews,
    ...stats
  } as Partial<Level>;

  await LevelModel.findByIdAndUpdate(level._id, update);
}

/**
 * Note... There are other ways we can 'update' a record in mongo like 'update' 'findOneAndUpdate' and 'updateMany'...
 * But slugs are usually needing to get updated only when the name changes which typically happens one at a time
 * So as long as we use updateOne we should be OK
 * Otherwise we will need to add more helpers or use a library
 * Problem with slug libraries for mongoose is that as of this writing (5/28/22) there seems to be issues importing them with typescript
 */

export default LevelSchema;
