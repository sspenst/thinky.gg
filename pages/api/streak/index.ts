import { GameId } from '@root/constants/GameId';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { PlayAttemptModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';

export async function getStreaks(userId: Types.ObjectId, gameId?: GameId) {
  const playAttemptAgg = await PlayAttemptModel.aggregate([
    {
      $match: {
        userId: userId,
        ...(gameId ? { gameId: gameId } : {}),
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: {
              $convert: {
                input: { $multiply: ['$startTime', 1000] },
                to: 'date',
                onError: null
              }
            },
            timezone: 'UTC'
          }
        },
        value: {
          $sum: {
            $subtract: ['$endTime', '$startTime']
          }
        }
      }
    },
    {
      $match: {
        value: {
          $gt: 0
        },
        _id: {
          $ne: null
        }
      }
    },
    {
      $sort: {
        _id: -1
      }
    },
    {
      $project: {
        date: '$_id',
        value: 1,
        _id: 0,
      }
    }
  ]);

  let streak = 0;
  const today = new Date(Date.now());

  today.setHours(0, 0, 0, 0);

  if (playAttemptAgg.length === 0) {
    return {
      currentStreak: 0,
      calendar: []
    };
  }

  const mostRecentPlay = new Date(playAttemptAgg[0].date);

  mostRecentPlay.setHours(0, 0, 0, 0);

  const daysSinceLastPlay = Math.floor((today.getTime() - mostRecentPlay.getTime()) / (1000 * 3600 * 24));

  if (daysSinceLastPlay > 1) {
    return {
      currentStreak: 0,
      calendar: playAttemptAgg as { date: Date, value: number }[]
    };
  }

  let currentDate = new Date(playAttemptAgg[0].date);

  currentDate.setHours(0, 0, 0, 0);

  streak = 1;

  for (let i = 1; i < playAttemptAgg.length; i++) {
    const prevDate = new Date(playAttemptAgg[i].date);

    prevDate.setHours(0, 0, 0, 0);

    const dayDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));

    if (dayDiff === 1) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }

  return {
    currentStreak: streak,
    calendar: playAttemptAgg as { date: Date, value: number }[]
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
