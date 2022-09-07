import cleanUser from '../lib/cleanUser';
import dbConnect from '../lib/dbConnect';
import Level from '../models/db/level';
import Review from '../models/db/review';
import User from '../models/db/user';
import { LevelModel, ReviewModel } from '../models/mongoose';
import { enrichLevels } from './enrich';
import { logger } from './logger';

export async function getReviewsForUserId(id: string | string[] | undefined, reqUser: User | null = null, queryOptions = {}) {
  await dbConnect();

  try {
    const levelsByUser = await LevelModel.find<Level>({ isDraft: false, userId: id }, '_id');
    const reviews = await ReviewModel.find<Review>({
      levelId: { $in: levelsByUser.map(level => level._id) }
    }, {}, queryOptions).populate('levelId', 'name slug leastMoves').sort({ ts: -1 }).populate('userId');

    // extract all the levels from reviews and put them in an array
    const levels = reviews.map(review => review.levelId).filter(level => level);
    const enrichedLevels = await enrichLevels(levels, reqUser);

    return reviews.map(review => {
      cleanUser(review.userId);
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

export async function getReviewsForUserIdCount(id: string | string[] | undefined) {
  await dbConnect();

  try {
    const levelsByUser = await LevelModel.find<Level>({ isDraft: false, userId: id }, '_id');
    const reviews = await ReviewModel.find<Review>({
      levelId: { $in: levelsByUser.map(level => level._id) },
    }).countDocuments();

    return reviews;
  } catch (err) {
    logger.error(err);

    return null;
  }
}
