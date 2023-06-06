import { ProStatsCommunityStepData } from '@root/contexts/levelContext';
import { ValidObjectId } from '@root/helpers/apiWrapper';
import mongoose from 'mongoose';
import { NextApiResponse } from 'next';
import ProStatsLevelType from '../../../../../constants/proStatsLevelType';
import isPro from '../../../../../helpers/isPro';
import cleanUser from '../../../../../lib/cleanUser';
import withAuth, { NextApiRequestWithAuth } from '../../../../../lib/withAuth';
import { PlayAttemptModel, StatModel } from '../../../../../models/mongoose';
import { AttemptContext } from '../../../../../models/schemas/playAttemptSchema';
import { USER_DEFAULT_PROJECTION } from '../../../../../models/schemas/userSchema';

async function getCommunityStepData(levelId: string, onlyLeastMoves: boolean) {
  // we want to grab the step data for the level
  // we want to see how many people have a statmodel for this level with a given step count
  // so we want to bucket the step counts
  // let's group by steps and sort step count ascending
  // we want to then output an array of objects with a step count and a count of how many people have that step count
  const agg = await StatModel.aggregate([
    {
      $match: {
        levelId: new mongoose.Types.ObjectId(levelId as string),
      },
    },
    {
      $sort: {
        ts: -1,
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: {
              ...USER_DEFAULT_PROJECTION
            }
          },
        ]
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        statTs: '$ts',
      }
    },
    {
      $group: {
        _id: '$moves',
        count: { $sum: 1 },
        users: { $push: '$$ROOT' },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
    {
      $project: {
        _id: 0,
        moves: '$_id',
        count: 1,
        users: { $slice: ['$users', 5] },
      },
    },
  ]) as ProStatsCommunityStepData[];

  // for each user run cleanUser
  agg.forEach(item => item.users.forEach(userAndStatTs => cleanUser(userAndStatTs.user)));

  if (onlyLeastMoves) {
    while (agg.length > 1) {
      agg.pop();
    }
  }

  return agg;
}

async function getCommunityPlayAttemptsData(levelId: string, userId: string) {
  const agg = await PlayAttemptModel.aggregate([
    {
      $match: {
        levelId: new mongoose.Types.ObjectId(levelId as string),
        userId: { $ne: new mongoose.Types.ObjectId(userId) },
        attemptContext: AttemptContext.JUST_BEATEN,
      },
    },
    {
      $group: {
        _id: null,
        players_with_beaten_playattempt: { $push: '$userId' },
      },
    },
    {
      $lookup: {
        from: 'playattempts',
        let: {
          levelId: new mongoose.Types.ObjectId(levelId as string),
          players_with_beaten_playattempt: '$players_with_beaten_playattempt' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$levelId', '$$levelId'] },
                  // check where user is in players_with_beaten_playattempt
                  { $in: ['$userId', '$$players_with_beaten_playattempt'] },
                  { $ne: ['$startTime', '$endTime'] },

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
        as: 'otherplayattempts',
      },
    },
    {
      $unwind: {
        path: '$otherplayattempts',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        count: { $size: '$players_with_beaten_playattempt' },
        sum: '$otherplayattempts.sumDuration',

      },
    },
  ]);

  return agg && agg[0];
}

async function getPlayAttemptsOverTime(levelId: string, userId: string) {
  return await PlayAttemptModel.aggregate([
    {
      $match: {
        levelId: new mongoose.Types.ObjectId(levelId),
        userId: new mongoose.Types.ObjectId(userId),
        attemptContext: { $in: [AttemptContext.JUST_BEATEN, AttemptContext.UNBEATEN] },
      }
    },
    {
      '$group': {
        '_id': {
          'startTime~~~day': {
            '$let': {
              'vars': {
                'parts': {
                  '$dateToParts': {
                    'timezone': 'GMT',
                    'date': {
                      '$dateFromParts': {
                        'second': '$startTime',
                        'year': 1970,
                        'timezone': 'UTC'
                      }
                    }
                  }
                }
              },
              'in': {
                '$dateFromParts': {
                  'timezone': 'GMT',
                  'year': '$$parts.year',
                  'month': '$$parts.month',
                  'day': '$$parts.day'
                }
              }
            }
          }
        },
        'sum': {
          '$sum': {
            '$divide': [
              {
                '$subtract': [
                  {
                    '$dateFromParts': {
                      'second': '$endTime',
                      'year': 1970,
                      'timezone': 'UTC'
                    }
                  },
                  {
                    '$dateFromParts': {
                      'second': '$startTime',
                      'year': 1970,
                      'timezone': 'UTC'
                    }
                  }
                ]
              },
              1000
            ]
          }
        }
      }
    },
    {
      '$sort': {
        '_id': 1
      }
    },
    {
      // filter out any group with a sum of 0
      '$match': {
        'sum': {
          '$gt': 0
        }
      }
    },
    {
      '$project': {
        '_id': 0,
        'date': '$_id.startTime~~~day',
        'sum': 1
      }
    }
  ]);
}

export default withAuth({
  GET: {
    query: {
      id: ValidObjectId(true),
    }
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const { id: levelId } = req.query as { id: string };
  const pro = isPro(req.user);
  const [communityStepData, playAttemptsOverTime, communityPlayAttemptsData] = await Promise.all([
    getCommunityStepData(levelId, !pro),
    ...(!pro ? [] : [
      getPlayAttemptsOverTime(levelId, req.userId),
      getCommunityPlayAttemptsData(levelId, req.userId),
    ]),
  ]);

  return res.status(200).json({
    [ProStatsLevelType.CommunityPlayAttemptsData]: communityPlayAttemptsData,
    [ProStatsLevelType.CommunityStepData]: communityStepData,
    [ProStatsLevelType.PlayAttemptsOverTime]: playAttemptsOverTime,
  });
});
