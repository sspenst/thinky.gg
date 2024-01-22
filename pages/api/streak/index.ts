import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { PlayAttemptModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';

export async function getStreaks(userId: Types.ObjectId) {
  const playAttemptAgg = await PlayAttemptModel.aggregate([
    {
      $match: {
        userId: userId
      }
    },
    {
      $group: {
        // $startTime is a timestamp (not a date)
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: {
              $toDate: {
                $multiply: [
                  '$startTime',
                  1000
                ]
              }
            }
          }
        },
        value: {
          // sum endTime - startTime
          $sum: {
            $subtract: [
              '$endTime',
              '$startTime'
            ]
          }
        }
      }
    },
    // filter out zero values
    {
      $match: {
        value: {
          $gt: 0
        }
      }
    },
    {
      // sort by date
      $sort: {
        _id: -1
      }
    },
    {
      // change _id to date
      $project: {
        date: '$_id',
        value: 1,
        _id: 0,
      }

    }
  ]);
  let streak = 0;
  const currentDate = new Date();

  for (let i = 0; i < playAttemptAgg.length; i++) {
    const playAttempt = playAttemptAgg[i];
    const date = new Date(playAttempt.date);
    const dateDiff = Math.floor((currentDate.getTime() - date.getTime()) / (1000 * 3600 * 24));

    // if the date diff is more than 24h, then the streak is broken
    if (dateDiff > 1) {
      break;
    } else {
      streak++;
    }

    currentDate.setDate(date.getDate());
  }

  return {
    currentStreak: streak,
    calendar: playAttemptAgg
  };
}

export default withAuth({
  GET: {},

}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  // group playattempts for user by day
  const { currentStreak, calendar } = await getStreaks(req.user._id);

  res.status(200).json({
    currentStreak,
    calendar,

  });
});
