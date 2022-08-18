import { ObjectId } from 'bson';
import type { NextApiRequest, NextApiResponse } from 'next';
import { enrichLevels } from '../../../helpers/enrich';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import Review from '../../../models/db/review';
import User from '../../../models/db/user';
import { LevelModel, ReviewModel } from '../../../models/mongoose';

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
  const reviews = await getReviewsForUserId(id, reqUser);

  if (!reviews) {
    return res.status(404).json({
      error: 'Error finding Reviews',
    });
  }

  return res.status(200).json(reviews);
}

export async function getReviewsForUserId(id: string | string[] | undefined, reqUser: User | null = null) {
  await dbConnect();

  try {
    const levelsByUser = await LevelModel.find<Level>({ isDraft: false, userId: id }, '_id');
    const reviews = await ReviewModel.find<Review>({
      levelId: { $in: levelsByUser.map(level => level._id) },
    }).populate('levelId', 'name slug leastMoves').sort({ ts: -1 }).populate('userId', '-email -password');

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
    logger.trace(err);

    return null;
  }
}
