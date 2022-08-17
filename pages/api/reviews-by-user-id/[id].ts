import { ObjectId } from 'bson';
import type { NextApiRequest, NextApiResponse } from 'next';
import { enrichLevelsWithUserStats } from '../../../helpers/enrichLevelsWithUserStats';
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
  const req_user = await getUserFromToken(token);
  const reviews = await getReviewsByUserId(id, req_user);

  if (!reviews) {
    return res.status(500).json({
      error: 'Error finding Reviews',
    });
  }

  return res.status(200).json(reviews);
}

export async function getReviewsByUserId(id: string | string[] | undefined, req_user: User | null = null) {
  await dbConnect();

  try {
    const reviews = await ReviewModel.find<Review>({ userId: id })
      .populate('levelId', 'name slug leastMoves').sort({ ts: -1 });
    const levels = reviews.map(review => review.levelId).filter(level => level);
    const enriched_levels = await enrichLevelsWithUserStats(levels, req_user);

    return reviews.map(review => {
      const new_review = (review as any).toObject();

      new_review.levelId = (enriched_levels.find((level: any) => level?._id.toString() === review.levelId?._id.toString()) as any);

      return new_review;
    });
  } catch (err) {
    logger.trace(err);

    return null;
  }
}
