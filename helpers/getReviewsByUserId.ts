import { GameId } from '@root/constants/GameId';
import cleanReview from '@root/lib/cleanReview';
import cleanUser from '@root/lib/cleanUser';
import { LEVEL_SEARCH_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { PipelineStage, QueryOptions, Types } from 'mongoose';
import GraphType from '../constants/graphType';
import User from '../models/db/user';
import { GraphModel, LevelModel, ReviewModel } from '../models/mongoose';
import { getEnrichLevelsPipelineSteps } from './enrich';
import { logger } from './logger';

export async function getReviewsByUserId(gameId: GameId, id: string | string[] | undefined, reqUser: User | null = null, queryOptions: QueryOptions = {}) {
  try {
    const lookupPipelineUser: PipelineStage[] = getEnrichLevelsPipelineSteps(reqUser, 'levelId');

    // Create the initial match criteria
    const matchCriteria: Record<string, any> = {
      isDeleted: { $ne: true },
      userId: new Types.ObjectId(id?.toString()),
      gameId: gameId
    };

    // Create pipeline
    const pipeline: PipelineStage[] = [
      { $match: matchCriteria },
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
      // Lookup level info
      {
        $lookup: {
          from: LevelModel.collection.name,
          localField: 'levelId',
          foreignField: '_id',
          as: 'levelId',
          pipeline: [
            {
              $project: LEVEL_SEARCH_DEFAULT_PROJECTION,
            },
          ],
        },
      },
      { $unwind: '$levelId' }
    ];

    // If we have a requesting user, add a lookup to filter out levels created by blocked users
    if (reqUser) {
      pipeline.push(
        // Lookup to check if the level creator is blocked
        {
          $lookup: {
            from: GraphModel.collection.name,
            let: { levelCreatorId: '$levelId.userId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$source', reqUser._id] },
                      { $eq: ['$target', '$$levelCreatorId'] },
                      { $eq: ['$type', GraphType.BLOCK] },
                      { $eq: ['$sourceModel', 'User'] },
                      { $eq: ['$targetModel', 'User'] }
                    ]
                  }
                }
              }
            ],
            as: 'blockStatus'
          }
        },
        // Only include levels where the creator is not blocked
        {
          $match: {
            'blockStatus': { $size: 0 }
          }
        },
        // Remove the blockStatus field
        {
          $project: {
            blockStatus: 0
          }
        }
      );
    }

    // Add the enrichment pipeline stages
    pipeline.push(...lookupPipelineUser);

    // Execute the pipeline
    const reviews = await ReviewModel.aggregate(pipeline);

    return reviews.map(review => {
      cleanReview(review.levelId.complete, reqUser, review);
      cleanUser(review.userId);

      return review;
    });
  } catch (err) {
    logger.error(err);

    return [];
  }
}

export async function getReviewsByUserIdCount(gameId: GameId, id: string | string[] | undefined, reqUser: User | null = null) {
  try {
    // Base query for counting reviews
    const baseQuery: Record<string, any> = {
      gameId: gameId
    };

    // Handle potential invalid ObjectId by using a try-catch
    try {
      baseQuery.userId = new Types.ObjectId(id?.toString());
    } catch (err) {
      // Invalid ObjectId, return 0 as there can't be any matches
      logger.error(`Invalid ObjectId in getReviewsByUserIdCount: ${id}`);

      return 0;
    }

    baseQuery.isDeleted = { $ne: true };

    // If no requesting user, do a simple count
    if (!reqUser) {
      return ReviewModel.countDocuments(baseQuery);
    }

    // Use aggregation with a lookup to filter out levels by blocked users
    const pipeline: PipelineStage[] = [
      { $match: baseQuery },
      // Lookup the level to check its owner
      {
        $lookup: {
          from: LevelModel.collection.name,
          localField: 'levelId',
          foreignField: '_id',
          as: 'level',
          pipeline: [
            { $project: { userId: 1 } }
          ]
        }
      },
      { $unwind: '$level' },
      // Lookup to check if the level creator is blocked
      {
        $lookup: {
          from: GraphModel.collection.name,
          let: { levelCreatorId: '$level.userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$source', reqUser._id] },
                    { $eq: ['$target', '$$levelCreatorId'] },
                    { $eq: ['$type', GraphType.BLOCK] },
                    { $eq: ['$sourceModel', 'User'] },
                    { $eq: ['$targetModel', 'User'] }
                  ]
                }
              }
            }
          ],
          as: 'blockStatus'
        }
      },
      // Only include levels where the creator is not blocked
      {
        $match: {
          'blockStatus': { $size: 0 }
        }
      },
      // Count the resulting documents
      {
        $count: 'total'
      }
    ];

    const result = await ReviewModel.aggregate(pipeline);

    return result.length > 0 ? result[0].total : 0;
  } catch (err) {
    logger.error(err);

    return 0;
  }
}
