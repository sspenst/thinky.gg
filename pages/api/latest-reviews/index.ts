import type { NextApiRequest, NextApiResponse } from 'next';
import { enrichLevelsWithUserStats } from '../../../helpers/enrich';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
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

  const token = req?.cookies?.token;

  const user = token ? await getUserFromToken(token) : null;
  const reviews = await getLatestReviews(user);

  if (!reviews) {
    return res.status(500).json({
      error: 'Error finding Reviews',
    });
  }

  return res.status(200).json(reviews);
}

export async function getLatestReviews(req_user: User | null = null) {
  await dbConnect();

  try {
    const reviews = await ReviewModel.find<Review>({ 'text': { '$exists': true } }, {}, { lean: false })
      .populate('levelId', 'name slug leastMoves')
      .populate('userId', '-email -password')
      .sort({ ts: -1 })
      .limit(10);

    if (!reviews) {
      return null;
    }

    if (!req_user) {
      return reviews;
    }

    // extract all the levels from reviews and put them in an array
    const levels = reviews.map(review => review.levelId).filter(level => level);
    const enriched_levels = await enrichLevelsWithUserStats(levels, req_user);

    return reviews.map(review => {
      cleanUser(review.userId);
      const new_review = (review as any).toObject();

      new_review.levelId = (enriched_levels.find((level: any) => level?._id.toString() === review.levelId?._id.toString()) as any);

      return new_review;
    });
  } catch (err) {
    logger.trace(err);

    return null;
  }
}
