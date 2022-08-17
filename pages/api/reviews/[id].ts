import type { NextApiRequest, NextApiResponse } from 'next';
import { cleanUser } from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import Review from '../../../models/db/review';
import { ReviewModel } from '../../../models/mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  await dbConnect();

  const reviews = await ReviewModel.find<Review>({ levelId: id })
    .populate('userId', '-email -password').sort({ ts: -1 });

  if (!reviews) {
    return res.status(404).json({
      error: 'Error finding Reviews',
    });
  }

  reviews.forEach(review => cleanUser(review.userId));

  return res.status(200).json(reviews);
}
