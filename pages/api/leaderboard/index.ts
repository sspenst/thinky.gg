import type { NextApiRequest, NextApiResponse } from 'next';
import User from '../../../models/db/user';
import { ReviewModel, UserModel } from '../../../models/mongoose';
import { cleanUser } from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const [users, reviewers] = await Promise.all([
    getLeaderboard(),
    getTopReviewers()
  ]);

  if (!users || !reviewers) {
    return res.status(500).json({
      error: 'Error finding Users',
    });
  }

  return res.status(200).json({ users: users, reviewers: reviewers });
}
export async function getTopReviewers() {
  await dbConnect();

  const topReviewers = await ReviewModel.aggregate([
    {
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
export async function getLeaderboard() {
  await dbConnect();

  try {
    const users = await UserModel.find<User>({
      score: { $ne: 0 },
      ts: { $exists: true },
    }, '-email -password');

    users.forEach(user => cleanUser(user));

    return users;
  } catch (err) {
    console.trace(err);

    return null;
  }
}
