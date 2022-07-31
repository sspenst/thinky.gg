import type { NextApiRequest, NextApiResponse } from 'next';
import User from '../../../models/db/user';
import { ReviewModel, UserModel } from '../../../models/mongoose';
import { cleanUser } from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import getTs from '../../../helpers/getTs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();
  const [topScorers, topRecordBreakers, topReviewers, currentlyOnlineCount, newUsers] = await getDataForLeaderboardPage();

  if (!topScorers || !topRecordBreakers || !topReviewers || !newUsers) {
    return res.status(500).json({
      error: 'Error finding Users',
    });
  }

  return res.status(200).json({ topScorers: topScorers, topRecordBreakers: topRecordBreakers, topReviewers: topReviewers, currentlyOnlineCount: currentlyOnlineCount, newUsers: newUsers });
}
export async function getDataForLeaderboardPage() {
  return await Promise.all([
    getTopScorers(),
    getTopRecordBreakers(),
    getTopReviewers(),
    getCurrentlyOnlineCount(),
    getNewUsers()
  ]);
}
export async function getNewUsers() {
  await dbConnect();
  const users = await UserModel.find({}, {}, { lean: true, sort: { ts: -1 }, limit: 25 });

  return users;
}

export async function getCurrentlyOnlineCount() {
  await dbConnect();
  // last 15m
  const count = await UserModel.countDocuments({ last_visited_at: { $gt: getTs() - 15 * 60 } });

  return count;
}
export async function getTopReviewers() {
  await dbConnect();
  // aggregate where score > 0
  const topReviewers = await ReviewModel.aggregate([
    {
      $match: {
        score: { $gt: 0 }
      },
    }, {
      $group: {
        _id: '$userId',
        count: { $sum: 1 },
        avg: { $avg: '$score' },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: 25,
    },
  ]);

  const topReviewerIds = topReviewers.map(reviewer => reviewer._id);

  const topReviewersWithData = await UserModel.find({ _id: { $in: topReviewerIds } }, {}, { lean: true });

  // also need to append the count to the user
  topReviewersWithData.forEach(user => {
    const reviewer = topReviewers.find(reviewer => reviewer._id.toString() === user._id.toString());

    if (reviewer) {
      user.count = reviewer.count;
      user.avg = reviewer.avg;
    }

    user = cleanUser(user);
  }
  );
  // sort
  topReviewersWithData.sort((a, b) => b.count - a.count);

  return topReviewersWithData;
}

export async function getTopRecordBreakers() {
  await dbConnect();

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

export async function getTopScorers() {
  await dbConnect();

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
