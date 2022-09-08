import type { NextApiRequest, NextApiResponse } from 'next';
import { UserWithCount } from '../../../components/statisticsTable';
import apiWrapper from '../../../helpers/apiWrapper';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import Review from '../../../models/db/review';
import User from '../../../models/db/user';
import { ReviewModel, StatModel, UserModel } from '../../../models/mongoose';
import Statistics from '../../../models/statistics';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const statistics = await getStatistics();

  if (!statistics) {
    return res.status(404).json({
      error: 'Error finding statistics',
    });
  }

  return res.status(200).json(statistics);
});

export async function getStatistics() {
  await dbConnect();

  const [
    currentlyOnlineCount,
    newUsers,
    registeredUsersCount,
    topRecordBreakers,
    topReviewers,
    topScorers,
    totalAttempts,
  ] = await Promise.all([
    getCurrentlyOnlineCount(),
    getNewUsers(),
    getRegisteredUsersCount(),
    getTopRecordBreakers(),
    getTopReviewers(),
    getTopScorers(),
    getTotalAttempts(),
  ]);

  if (!newUsers || !topRecordBreakers || !topReviewers || !topScorers) {
    return null;
  }

  return {
    currentlyOnlineCount: currentlyOnlineCount,
    newUsers: newUsers,
    registeredUsersCount: registeredUsersCount,
    topRecordBreakers: topRecordBreakers,
    topReviewers: topReviewers,
    topScorers: topScorers,
    totalAttempts: totalAttempts,
  } as Statistics;
}

async function getCurrentlyOnlineCount() {
  // active in the last 15 minutes
  return await UserModel.countDocuments({ last_visited_at: { $gt: TimerUtil.getTs() - 15 * 60 } });
}

async function getRegisteredUsersCount() {
  return await UserModel.countDocuments({ ts: { $exists: true } });
}

async function getTotalAttempts() {
  try {
    return (await StatModel.aggregate([
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: '$attempts' },
        },
      },
    ]))[0]?.totalAttempts as number || 0;
  } catch (err) {
    logger.error(err);

    return 0;
  }
}

async function getNewUsers() {
  try {
    const users = await UserModel.find<User>({}, {}, { lean: true, sort: { ts: -1 }, limit: 25 });

    users.forEach(user => cleanUser(user));

    return users;
  } catch (err) {
    logger.error(err);

    return null;
  }
}

async function getTopRecordBreakers() {
  try {
    const users = await UserModel.find<User>({
      score: { $ne: 0 },
      ts: { $exists: true },
    }, {}, {
      sort: { calc_records: -1 },
      limit: 25,
      lean: true,
    });

    users.forEach(user => cleanUser(user));

    return users;
  } catch (err) {
    logger.error(err);

    return null;
  }
}

async function getTopReviewers() {
  try {
    const topReviewers = await ReviewModel.aggregate<Review & {
      reviewCount: number;
      scoreCount: number;
      scoreTotal: number;
    }>([
      {
        $project: {
          hasScore: {
            $cond: [{ $gt: ['$score', 0] }, 1, 0]
          },
          score: 1,
          userId: 1,
        },
      },
      {
        $group: {
          _id: '$userId',
          reviewCount: { $sum: 1 },
          scoreCount: { $sum: '$hasScore' },
          scoreTotal: { $sum: '$score' },
        },
      },
      {
        $sort: { reviewCount: -1 },
      },
      {
        $limit: 25,
      },
    ]);

    const topReviewerIds = topReviewers.map(reviewer => reviewer._id);
    const topReviewersWithData = await UserModel.find<UserWithCount>({ _id: { $in: topReviewerIds } }, {}, { lean: true });

    // also need to append the count to the user
    topReviewersWithData.forEach(user => {
      const reviewer = topReviewers.find(reviewer => reviewer._id.toString() === user._id.toString());

      if (reviewer) {
        user.reviewCount = reviewer.reviewCount;
        user.reviewAvg = reviewer.scoreTotal / reviewer.scoreCount;
      }

      cleanUser(user);
    });

    topReviewersWithData.sort((a, b) => b.reviewCount - a.reviewCount);

    return topReviewersWithData;
  } catch (err) {
    logger.error(err);

    return null;
  }
}

async function getTopScorers() {
  try {
    const users = await UserModel.find<User>({
      score: { $ne: 0 },
      ts: { $exists: true },
    }, {}, {
      sort: { score: -1 },
      limit: 25,
      lean: true,
    });

    users.forEach(user => cleanUser(user));

    return users;
  } catch (err) {
    logger.error(err);

    return null;
  }
}
