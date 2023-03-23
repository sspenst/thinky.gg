import mongoose from 'mongoose';
import { NextApiResponse } from 'next';
import { ValidEnum } from '../../../../../helpers/apiWrapper';
import { DIFFICULTY_LOGISTIC_K, DIFFICULTY_LOGISTIC_M, DIFFICULTY_LOGISTIC_T } from '../../../../../helpers/getDifficultyEstimate';
import isPro from '../../../../../helpers/isPro';
import { ProStatsUserType } from '../../../../../hooks/useProStatsUser';
import withAuth, { NextApiRequestWithAuth } from '../../../../../lib/withAuth';
import { StatModel } from '../../../../../models/mongoose';
import { AttemptContext } from '../../../../../models/schemas/playAttemptSchema';

async function getDifficultyDataComparisons(userId: string) {
  /** TODO: Store this in a K/V store with an expiration of like 1 day... */
  const difficultyData = await StatModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        complete: true,
        isDeleted: { $ne: true },

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
        ts: 1
      },
    },

    {
      $limit: 100
    },
    {
      $lookup: {
        from: 'levels',
        localField: 'levelId',
        foreignField: '_id',
        as: 'level',
      },
    },
    {
      $unwind: '$level',
    },
    {
      $project: {
        _id: '$level._id',
        name: '$level.name',
        difficulty: '$level.calc_difficulty_estimate',
        ts: 1,
        slug: '$level.slug',
        calc_playattempts_just_beaten_count: '$level.calc_playattempts_just_beaten_count',
        calc_playattempts_duration_sum: '$level.calc_playattempts_duration_sum',
      },
    },
    {
      $lookup: {
        from: 'playattempts',
        let: { levelId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$levelId', '$$levelId'] },
                  // user too
                  { $eq: ['$userId', new mongoose.Types.ObjectId(userId)] },
                ],
              },
            },
          },
          {
            $match: {
              attemptContext: { $in: [AttemptContext.JUST_BEATEN, AttemptContext.UNBEATEN] },
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
        as: 'playattempts',
      },
    },
    {
      $addFields: {
        playattempts: {
          $arrayElemAt: ['$playattempts', 0],
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        difficulty: 1,
        slug: 1,
        ts: 1,
        calc_playattempts_just_beaten_count: 1,
        averageDuration: { $divide: ['$playattempts.sumDuration', '$playattempts.count'] },
        calc_playattempts_duration_sum: 1,
      },
    },
  ]);

  // loop through all the levels and manipulate difficulty
  /*
  const m = 20;
  const t = 0.2;
  const k = 1.5;
  const beatenCountFactor = ((k - 1) / (1 + Math.exp(t * (beatenCount - m)))) + 1;
  */
  const m = DIFFICULTY_LOGISTIC_M;
  const t = DIFFICULTY_LOGISTIC_T;
  const k = DIFFICULTY_LOGISTIC_K;

  for (let i = 0; i < difficultyData.length; i++) {
    const level = difficultyData[i];
    const beatenCount = !level.calc_playattempts_just_beaten_count ? 1 : level.calc_playattempts_just_beaten_count;

    const beatenCountFactor = ((k - 1) / (1 + Math.exp(t * (beatenCount - m)))) + 1;

    if (level.averageDuration) {
      level.difficultyAdjusted = level.difficulty / beatenCountFactor;
    }
  }

  return difficultyData;
}

async function getScoreHistory(userId: string) {
  const history = await StatModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isDeleted: { $ne: true },
        complete: true,
        // where ts > 6 months ago
        ts: { $gt: Math.floor(Date.now() / 1000) - (60 * 60 * 24 * 30 * 6) },
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

  // let's get the sum of this players playattempts sum(playattempt.endTime - playattempt.startTime) and divide by 1000
  let scoreHistory, difficultyLevelsComparisons;

  if (type === ProStatsUserType.DifficultyLevelsComparisons) {
    difficultyLevelsComparisons = await getDifficultyDataComparisons(userId);
  } else if (type === ProStatsUserType.ScoreHistory) {
    scoreHistory = await getScoreHistory(userId);
  }

  return res.status(200).json({
    [ProStatsUserType.ScoreHistory]: scoreHistory,
    [ProStatsUserType.DifficultyLevelsComparisons]: difficultyLevelsComparisons,
  });
});
