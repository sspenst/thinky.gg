import { PipelineStage, QueryOptions, Types } from 'mongoose';
import cleanUser from '../lib/cleanUser';
import dbConnect from '../lib/dbConnect';
import Level from '../models/db/level';
import Review from '../models/db/review';
import User from '../models/db/user';
import { LevelModel, ReviewModel, UserModel } from '../models/mongoose';
import { getEnrichLevelsPipelineSteps } from './enrich';
import { logger } from './logger';

export async function getReviewsForUserId(id: string | string[] | undefined, reqUser: User | null = null, queryOptions: QueryOptions = {}) {
  await dbConnect();

  try {
    const lookupPipelineUser: PipelineStage[] = getEnrichLevelsPipelineSteps(reqUser);

    const levelsByUserAgg = await LevelModel.aggregate(([
      { $match: { isDeleted: { $ne: true }, isDraft: false, userId: new Types.ObjectId(id?.toString()) } },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          leastMoves: 1,
        }
      },
      // now get all the reviwes for these levels
      {
        $lookup: {
          from: ReviewModel.collection.name,
          localField: '_id', //
          foreignField: 'levelId',
          as: 'reviews',
        },
      },
      // unwind the reviews array to get each review as a separate document
      {
        $unwind: '$reviews',
      },
      {
        $project: {
          levelId: {
            _id: '$_id',
            name: '$name',
            slug: '$slug',
            leastMoves: '$leastMoves',
          },
          _id: '$reviews._id',
          userId: '$reviews.userId',
          ts: '$reviews.ts',
          score: '$reviews.score',
          text: '$reviews.text',
        }
      },
      {
        $sort: {
          ts: -1,
        },
      },
      {
        $skip: queryOptions?.skip || 0
      },
      {
        $limit: queryOptions?.limit || 10,
      },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
        },
      },
      {
        $unwind: {
          path: '$userId',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          levelId: {
            _id: 1,
            name: 1,
            slug: 1,
            leastMoves: 1,
          },
          userId: {
            _id: '$userId._id',
            name: '$userId.name',
            ts: '$userId.ts',
            last_visited_at: '$userId.last_visited_at',
            avatarUpdatedAt: '$userId.avatarUpdatedAt',
            hideStatus: '$userId.hideStatus',
          },
          _id: 1,
          ts: 1,
          score: 1,
          text: 1
        }
      },
    ] as PipelineStage[]).concat(lookupPipelineUser));

    return levelsByUserAgg.map(review => {
      cleanUser(review.userId);

      return review;
    });
  } catch (err) {
    logger.error(err);

    return null;
  }
}

export async function getReviewsForUserIdCount(id: string | string[] | undefined) {
  await dbConnect();

  try {
    const levelsByUser = await LevelModel.find<Level>({ isDeleted: { $ne: true }, isDraft: false, userId: id }, '_id');
    const reviews = await ReviewModel.find<Review>({
      levelId: { $in: levelsByUser.map(level => level._id) },
    }).countDocuments();

    return reviews;
  } catch (err) {
    logger.error(err);

    return null;
  }
}
