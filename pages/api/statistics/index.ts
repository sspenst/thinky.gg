import type { NextApiRequest, NextApiResponse } from 'next';
import { ReviewModel, StatModel, UserModel } from '../../../models/mongoose';
import Review from '../../../models/db/review';
import Statistics from '../../../models/statistics';
import User from '../../../models/db/user';
import { UserWithCount } from '../../../components/statisticsTable';
import { cleanUser } from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import getTs from '../../../helpers/getTs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const statistics = await getStatistics();

  if (!statistics) {
    return res.status(500).json({
      error: 'Error finding statistics',
    });
  }

  return res.status(200).json(statistics);
}

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
  return await UserModel.countDocuments({ last_visited_at: { $gt: getTs() - 15 * 60 } });
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
    ]))[0].totalAttempts as number;
  } catch (err) {
    console.trace(err);

    return 0;
  }
}

async function getNewUsers() {
  try {
    const users = await UserModel.find<User>({}, '-email -password', { lean: true, sort: { ts: -1 }, limit: 25 });

    users.forEach(user => cleanUser(user));

    return users;
  } catch (err) {
    console.trace(err);

    return null;
  }
}

async function getTopRecordBreakers() {
  try {
    const users = await UserModel.find<User>({
      score: { $ne: 0 },
      ts: { $exists: true },
    }, '-email -password', {
      sort: { calc_records: -1 },
      limit: 25,
      lean: true,
    });

    users.forEach(user => cleanUser(user));

    return users;
  } catch (err) {
    console.trace(err);

    return null;
  }
}

async function getTopReviewers() {
  try {
    // aggregate where score > 0
    const topReviewers = await ReviewModel.aggregate<Review & {
      reviewAvg: number;
      reviewCount: number;
    }>([
      {
        $match: {
          score: { $gt: 0 }
        },
      }, {
        $group: {
          _id: '$userId',
          reviewCount: { $sum: 1 },
          reviewAvg: { $avg: '$score' },
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
    const topReviewersWithData = await UserModel.find<UserWithCount>({ _id: { $in: topReviewerIds } }, '-email -password', { lean: true });

    // also need to append the count to the user
    topReviewersWithData.forEach(user => {
      const reviewer = topReviewers.find(reviewer => reviewer._id.toString() === user._id.toString());

      if (reviewer) {
        user.reviewCount = reviewer.reviewCount;
        user.reviewAvg = reviewer.reviewAvg;
      }

      cleanUser(user);
    });

    topReviewersWithData.sort((a, b) => b.reviewCount - a.reviewCount);

    return topReviewersWithData;
  } catch (err) {
    console.trace(err);

    return null;
  }
}

async function getTopScorers() {
  try {
    const users = await UserModel.find<User>({
      score: { $ne: 0 },
      ts: { $exists: true },
    }, '-email -password', {
      sort: { score: -1 },
      limit: 25,
      lean: true,
    });

    users.forEach(user => cleanUser(user));

    return users;
  } catch (err) {
    console.trace(err);

    return null;
  }
}
