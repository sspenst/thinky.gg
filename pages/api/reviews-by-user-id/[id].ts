import type { NextApiRequest, NextApiResponse } from 'next';
import Level from '../../../models/db/level';
import Review from '../../../models/db/review';
import { ReviewModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  await dbConnect();

  const reviews = await ReviewModel.find<Review>({ userId: id })
    .populate<{levelId: Level}>('levelId', '_id name').sort({ ts: -1 });

  if (!reviews) {
    return res.status(500).json({
      error: 'Error finding Reviews',
    });
  }

  res.status(200).json(reviews);
}
