import type { NextApiRequest, NextApiResponse } from 'next';
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
  const reviews = await getReviewsByUserId(id);

  if (!reviews) {
    return res.status(500).json({
      error: 'Error finding Reviews',
    });
  }

  return res.status(200).json(reviews);
}

export async function getReviewsByUserId(id: string | string[] | undefined) {
  await dbConnect();

  try {
    return await ReviewModel.find<Review>({ userId: id })
      .populate('levelId', 'name slug').sort({ ts: -1 });
  } catch (err) {
    console.trace(err);

    return null;
  }
}
