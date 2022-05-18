import type { NextApiRequest, NextApiResponse } from 'next';
import Level from '../../../models/db/level';
import Review from '../../../models/db/review';
import { ReviewModel } from '../../../models/mongoose';
import User from '../../../models/db/user';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();

  const reviews = await ReviewModel.find<Review>()
    .populate<{levelId: Level}>('levelId', '_id name')
    .populate<{userId: User}>('userId', '_id name')
    .sort({ ts: -1 })
    .limit(10);

  if (!reviews) {
    return res.status(500).json({
      error: 'Error finding Reviews',
    });
  }

  return res.status(200).json(reviews);
}
