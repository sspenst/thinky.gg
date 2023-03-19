import mongoose from 'mongoose';
import { NextApiResponse } from 'next';
import isPro from '../../../helpers/isPro';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { PlayAttemptModel } from '../../../models/mongoose';
import { AttemptContext } from '../../../models/schemas/playAttemptSchema';

export default withAuth({
  GET: {
  }
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (!isPro(req.user)) {
    return res.status(401).json({
      error: 'Not authorized',
    });
  }

  const { levelId } = req.query;

  // let's get the sum of this players playattempts sum(playattempt.endTime - playattempt.startTime) and divide by 1000
  const playattemptSum = await PlayAttemptModel.aggregate([
    {
      $match: {

        levelId: new mongoose.Types.ObjectId(levelId as string),
        userId: new mongoose.Types.ObjectId(req.userId),
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
      '$project': {
        '_id': false,
        'date': '$_id.startTime~~~day',
        'sum': true
      }
    }
  ]);

  return res.status(200).json({
    agg: playattemptSum,
    playAttemptData: playattemptSum

  });
});
