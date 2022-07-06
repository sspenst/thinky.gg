import { LevelModel, ReviewModel } from '../../../models/mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import Review from '../../../models/db/review';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  await dbConnect();
  const levels = await LevelModel.find<Review>({ userId: id, isDraft: false });
  const reviews_received = await ReviewModel.find<Review>({
    levelId: { $in: levels.map(level => level._id) },
  }).populate('levelId', '_id name slug').sort({ ts: -1 }).populate('userId', '_id name');

  if (!reviews_received) {
    return res.status(500).json({
      error: 'Error finding Reviews',
    });
  }

  return res.status(200).json(reviews_received);
}
