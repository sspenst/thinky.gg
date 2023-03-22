import mongoose from 'mongoose';
import { NextApiResponse } from 'next';
import { type } from 'os';
import { ValidType } from '../../../../helpers/apiWrapper';
import isPro from '../../../../helpers/isPro';
import { ProStatsType } from '../../../../hooks/useProStats';
import withAuth, { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { PlayAttemptModel, StatModel } from '../../../../models/mongoose';
import { AttemptContext } from '../../../../models/schemas/playAttemptSchema';

async function getCommunityStepData(levelId: string) {
  // we want to grab the step data for the level
  // we want to see how many people have a statmodel for this level with a given step count
  // so we want to bucket the step counts
  // let's group by steps and sort step count ascending
  // we want to then output an array of objects with a step count and a count of how many people have that step count
  return await StatModel.aggregate([
    {
      $match: {
        levelId: new mongoose.Types.ObjectId(levelId as string),
      },
    },
    {
      $group: {
        _id: '$moves',
        count: { $sum: 1 },
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
      },
    }

  ]);
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
      '$project': {
        '_id': false,
        'date': '$_id.startTime~~~day',
        'sum': true
      }
    }
  ]);
}

export default withAuth({
  GET: {
    query: {
      type: ValidType('string', false, true),
    }
  }
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (!isPro(req.user)) {
    return res.status(401).json({
      error: 'Not authorized',
    });
  }

  const { levelId, type } = req.query as { levelId: string, type: string };

  // let's get the sum of this players playattempts sum(playattempt.endTime - playattempt.startTime) and divide by 1000
  let playAttemptsOverTime;
  let communityStepData;

  if (type === ProStatsType.PlayAttemptsOverTime) {
    playAttemptsOverTime = await getPlayAttemptsOverTime(levelId, req.userId);
  } else if (type === ProStatsType.CommunityStepData) {
    communityStepData = await getCommunityStepData(levelId);
  }

  return res.status(200).json({
    [ProStatsType.PlayAttemptsOverTime]: playAttemptsOverTime,
    [ProStatsType.CommunityStepData]: communityStepData,
  });
});
