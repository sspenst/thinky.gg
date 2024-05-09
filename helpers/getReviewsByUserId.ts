import { GameId } from '@root/constants/GameId';
import cleanReview from '@root/lib/cleanReview';
import cleanUser from '@root/lib/cleanUser';
import { LEVEL_SEARCH_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { PipelineStage, QueryOptions, Types } from 'mongoose';
import Review from '../models/db/review';
import User from '../models/db/user';
import { LevelModel, ReviewModel } from '../models/mongoose';
import { getEnrichLevelsPipelineSteps } from './enrich';
import { logger } from './logger';

export async function getReviewsByUserId(gameId: GameId, id: string | string[] | undefined, reqUser: User | null = null, queryOptions: QueryOptions = {}) {
  try {
    const lookupPipelineUser: PipelineStage[] = getEnrichLevelsPipelineSteps(reqUser, 'levelId');

    const levelsByUserAgg = await ReviewModel.aggregate(([
      {
        $match:
        {
          isDeleted: { $ne: true },
          userId: new Types.ObjectId(id?.toString()),
          gameId: gameId
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
      // Do not need to populate the userId of the reviewer since the reviews page will already have the user's info
      {
        $lookup: {
          from: LevelModel.collection.name,
          localField: 'levelId', //
          foreignField: '_id',
          as: 'levelId',
          pipeline: [
            {
              $project: LEVEL_SEARCH_DEFAULT_PROJECTION,
            },
          ],
        },
      },
      {
        $unwind: '$levelId',
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

export async function getReviewsByUserIdCount(gameId: GameId, id: string | string[] | undefined) {
  try {
    const reviews = await ReviewModel.find<Review>({ userId: id, isDeleted: { $ne: true }, gameId: gameId }).countDocuments();

    return reviews;
  } catch (err) {
    logger.error(err);

    return null;
  }
}
