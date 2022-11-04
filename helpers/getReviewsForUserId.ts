import { PipelineStage, QueryOptions, Types } from 'mongoose';
import cleanUser from '../lib/cleanUser';
import dbConnect from '../lib/dbConnect';
import Level from '../models/db/level';
import Review from '../models/db/review';
import User from '../models/db/user';
import { LevelModel, ReviewModel } from '../models/mongoose';
import { logger } from './logger';

export async function getReviewsForUserId(id: string | string[] | undefined, reqUser: User | null = null, queryOptions: QueryOptions = {}) {
  await dbConnect();

  try {
    const lookupPipelineUser: PipelineStage[] = reqUser ? [{

      $lookup: {
        from: 'stats',
        let: { levelId: '$levelId._id', userId: reqUser?._id },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$levelId', '$$levelId'] },
                  { $eq: ['$userId', '$$userId'] },
                ],
              },
            },
          },
        ],
        as: 'stat',
      }
    },
    {
      $unwind: {
        path: '$stat',
        preserveNullAndEmptyArrays: true,
      }
    },
    {
      $set: {
        'levelId.userAttempts': '$stat.attempts',
        'levelId.userMoves': '$stat.moves',
        'levelId.userMovesTs': '$stat.ts',
      },
    },
    {
      $unset: 'stat',
    }] : [{
      $unset: 'stat',
    }];

    const levelsByUserAgg = await LevelModel.aggregate([
      { $match: { isDraft: false, userId: new Types.ObjectId(id?.toString()) } },
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
          from: 'reviews',
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
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
        },
      },
      {
        $unwind: '$userId',
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
    ].concat(lookupPipelineUser as any) as unknown as PipelineStage[]);

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
