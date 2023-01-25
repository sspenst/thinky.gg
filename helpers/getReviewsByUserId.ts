import dbConnect from '../lib/dbConnect';
import Review from '../models/db/review';
import User from '../models/db/user';
import { ReviewModel } from '../models/mongoose';
import { enrichLevels } from './enrich';
import { logger } from './logger';

export async function getReviewsByUserId(id: string | string[] | undefined, reqUser: User | null = null, queryOptions = {}) {
  await dbConnect();

  try {
    const reviews = await ReviewModel.find<Review>({ userId: id, isDeleted: { $ne: true } }, {}, queryOptions)
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
    logger.error(err);

    return null;
  }
}

export async function getReviewsByUserIdCount(id: string | string[] | undefined) {
  await dbConnect();

  try {
    const reviews = await ReviewModel.find<Review>({ userId: id, isDeleted: { $ne: true } }).countDocuments();

    return reviews;
  } catch (err) {
    logger.error(err);

    return null;
  }
}
