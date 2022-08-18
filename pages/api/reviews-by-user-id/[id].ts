import { ObjectId } from 'bson';
import type { NextApiRequest, NextApiResponse } from 'next';
import { enrichLevels } from '../../../helpers/enrich';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Review from '../../../models/db/review';
import User from '../../../models/db/user';
import { ReviewModel } from '../../../models/mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  if (!id || !ObjectId.isValid(id as string)) {
    return res.status(400).json({
      error: 'Invalid id',
    });
  }

  const token = req.cookies?.token;
  const reqUser = await getUserFromToken(token);
  const reviews = await getReviewsByUserId(id, reqUser);

  if (!reviews) {
    return res.status(500).json({
      error: 'Error finding Reviews',
    });
  }

  return res.status(200).json(reviews);
}

export async function getReviewsByUserId(id: string | string[] | undefined, reqUser: User | null = null) {
  await dbConnect();

  try {
    const reviews = await ReviewModel.find<Review>({ userId: id })
      .populate('levelId', 'name slug leastMoves').sort({ ts: -1 });
    const levels = reviews.map(review => review.levelId).filter(level => level);
    const enrichedLevels = await enrichLevels(levels, reqUser);

    return reviews.map(review => {
      const newReview = JSON.parse(JSON.stringify(review)) as Review;
      const enrichedLevel = enrichedLevels.find(level => level._id.toString() === review.levelId._id.toString());

      if (enrichedLevel) {
        newReview.levelId = enrichedLevel;
      }

      return newReview;
    });
  } catch (err) {
    logger.trace(err);

    return null;
  }
}
