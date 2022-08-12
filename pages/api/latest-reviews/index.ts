import type { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../../../helpers/logger';
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

  const reviews = await getLatestReviews();

  if (!reviews) {
    return res.status(500).json({
      error: 'Error finding Reviews',
    });
  }

  return res.status(200).json(reviews);
}

export async function getLatestReviews() {
  await dbConnect();

  try {
    const reviews = await ReviewModel.find<Review>({ 'text': { '$exists': true } }, {}, { lean: false })
      .populate('levelId', 'name slug')
      .populate('userId', '-email -password')
      .sort({ ts: -1 })
      .limit(10);

    reviews.forEach(review => cleanUser(review.userId));

    return reviews;
  } catch (err) {
    logger.trace(err);

    return null;
  }
}
