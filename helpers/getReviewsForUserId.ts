import { GameId } from '@root/constants/GameId';
import cleanReview from '@root/lib/cleanReview';
import { PipelineStage, QueryOptions, Types } from 'mongoose';
import cleanUser from '../lib/cleanUser';
import Level from '../models/db/level';
import User from '../models/db/user';
import { LevelModel, ReviewModel, UserModel } from '../models/mongoose';
import { getEnrichLevelsPipelineSteps, getEnrichUserConfigPipelineStage } from './enrich';
import { logger } from './logger';

export async function getReviewsForUserId(gameId: GameId, id: string | string[] | undefined, reqUser: User | null = null, queryOptions: QueryOptions = {}) {
  try {
    const lookupPipelineUser: PipelineStage[] = getEnrichLevelsPipelineSteps(reqUser, 'levelId');

    const levelsByUserAgg = await LevelModel.aggregate(([
      {
        $match:
        {
          isDeleted: { $ne: true },
          isDraft: false,
          userId: new Types.ObjectId(id?.toString()),
          gameId: gameId
        }
      },
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
        $lookup: {
          from: UserModel.collection.name,
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
          pipeline: [
            ...getEnrichUserConfigPipelineStage(gameId),
          ],
        },
      },
      {
        $unwind: {
          path: '$userId',
          // important to not preserveNullAndEmptyArrays here, because we want to ignore reviews where the reviewer has been deleted
        },
      },
      {
        $skip: queryOptions?.skip || 0
      },
      {
        $limit: queryOptions?.limit || 10,
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
            config: 1
          },
          _id: 1,
          ts: 1,
          score: 1,
          text: 1
        }
      },
    ] as PipelineStage[]).concat(lookupPipelineUser));

    return levelsByUserAgg.map(review => {
      cleanReview(review.levelId.complete, reqUser, review);
      cleanUser(review.userId);

      return review;
    });
  } catch (err) {
    logger.error(err);

    return null;
  }
}

export async function getReviewsForUserIdCount(gameId: GameId, id: string | string[] | undefined) {
  try {
    const levelsByUser = await LevelModel.find<Level>({ isDeleted: { $ne: true }, isDraft: false, userId: id, gameId: gameId }, '_id');
    const reviewsCountAgg = await ReviewModel.aggregate([
      {
        $match: {
          levelId: { $in: levelsByUser.map(level => level._id) },
        },
      },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
          pipeline: [
            {
              $project: {
                _id: 1,
              },
            },
          ],
        },
      },
      // TODO: soft delete reviews so we can use isDeleted instead of populating users to filter out deleted users
      {
        $unwind: {
          path: '$userId',
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);

    return reviewsCountAgg.length > 0 ? reviewsCountAgg[0].count : 0;
  } catch (err) {
    logger.error(err);

    return null;
  }
}
