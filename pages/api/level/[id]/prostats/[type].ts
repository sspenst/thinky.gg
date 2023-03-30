import { ValidEnum } from '@root/helpers/apiWrapper';
import User from '@root/models/db/user';
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
          // add toe user the ts from statmodel
        ]
      },
    },
    // let's merge the user into the statmodel
    {
      // bring the ts from the statmodel into the user
      $addFields: {
        user: {
          statTs: '$ts',
        }
      }
    },
    {
      $group: {
        _id: '$moves',
        count: { $sum: 1 },
        userIds: { $push: '$user' },

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
        users: { $slice: ['$userIds', 5] },
      },
    },
  ]);

  // for each user run cleanUser
  agg.forEach((item) => {
    item.users = item.users?.map((user: User[]) => {
      cleanUser(user[0]);

      return user[0];
    });
  });

  if (onlyLeastMoves) {
    while (agg.length > 1) {
      agg.pop();
    }
  }

  return agg;
}

async function getPlayAttemptsOverTime(levelId: string, userId: string) {
  return await PlayAttemptModel.aggregate([
    {
      $match: {
        levelId: new mongoose.Types.ObjectId(levelId),
        userId: new mongoose.Types.ObjectId(userId),
        // attemptContext is either BEATEN or UNBEATEN
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
      // limit to top 10 step groups
      '$limit': 10
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
      type: ValidEnum(Object.values(ProStatsLevelType)),
    }
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const { id: levelId, type } = req.query as { id: string, type: string };

  // let's get the sum of this players playattempts sum(playattempt.endTime - playattempt.startTime) and divide by 1000
  let playAttemptsOverTime;
  let communityStepData;

  if (type === ProStatsLevelType.PlayAttemptsOverTime) {
    if (!isPro(req.user)) {
      return res.status(401).json({
        error: 'Not authorized',
      });
    }

    playAttemptsOverTime = await getPlayAttemptsOverTime(levelId, req.userId);
  } else if (type === ProStatsLevelType.CommunityStepData) {
    communityStepData = await getCommunityStepData(levelId, !isPro(req.user));
  }

  return res.status(200).json({
    [ProStatsLevelType.PlayAttemptsOverTime]: playAttemptsOverTime,
    [ProStatsLevelType.CommunityStepData]: communityStepData,
  });
});
