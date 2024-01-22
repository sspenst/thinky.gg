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
    }, {
      // change _id to date
      $project: {
        date: '$_id',
        value: 1,
        _id: 0,
      }

    }
  ]);

  const streaks = [];
  let streak = 0;
  let lastDay = null;

  for (const playAttempt of playAttemptAgg) {
    if (lastDay === null) {
      streak = 1;
    } else {
      const diff = new Date(lastDay).getTime() - new Date(playAttempt._id).getTime();

      if (diff === 86400000) {
        streak++;
      } else {
        streaks.push(streak);
        streak = 1;
      }
    }

    lastDay = playAttempt._id;
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
    calendar
  });
});
