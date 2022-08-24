import type { NextApiRequest, NextApiResponse } from 'next';
import { enrichLevels } from '../../../helpers/enrich';
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
  const reqUser = token ? await getUserFromToken(token) : null;
  const reviews = await getLatestReviews(reqUser);

  if (!reviews) {
    return res.status(500).json({
      error: 'Error finding Reviews',
    });
  }

  return res.status(200).json(reviews);
}

export async function getLatestReviews(reqUser: User | null = null) {
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

    if (!reqUser) {
      return reviews;
    }

    // extract all the levels from reviews and put them in an array
    const levels = reviews.map(review => review.levelId).filter(level => level);
    const enrichedLevels = await enrichLevels(levels, reqUser);

    return reviews.map(review => {
      const newReview = JSON.parse(JSON.stringify(review)) as Review;
      const enrichedLevel = enrichedLevels.find(level => level._id.toString() === newReview.levelId._id.toString());

      if (enrichedLevel) {
        newReview.levelId = enrichedLevel;
      }

      cleanUser(newReview.userId);

      return newReview;
    });
  } catch (err) {
    logger.error(err);

    return null;
  }
}
