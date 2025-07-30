import { GameId } from '@root/constants/GameId';
import cleanReview from '@root/lib/cleanReview';
import { PipelineStage, QueryOptions, Types } from 'mongoose';
import GraphType from '../constants/graphType';
import cleanUser from '../lib/cleanUser';
import Level from '../models/db/level';
import User from '../models/db/user';
import { GraphModel, LevelModel, ReviewModel, UserModel } from '../models/mongoose';
import { getEnrichLevelsPipelineSteps, getEnrichUserConfigPipelineStage } from './enrich';
import { logger } from './logger';

export async function getReviewsForUserId(gameId: GameId | undefined, id: string | string[] | undefined, reqUser: User | null = null, queryOptions: QueryOptions = {}) {
  try {
    const lookupPipelineUser: PipelineStage[] = getEnrichLevelsPipelineSteps(reqUser, 'levelId');

    // Get the levels created by the target user
    const levelsCreatedByUser = await LevelModel.find({
      isDeleted: { $ne: true },
      isDraft: false,
      userId: new Types.ObjectId(id?.toString()),
      ...(gameId !== undefined ? { gameId: gameId } : {})
    }, '_id');

    // Only proceed if the user has created levels
    if (!levelsCreatedByUser.length) {
      return [];
    }

    // Create the initial pipeline
    const pipeline: PipelineStage[] = [
      {
        $match: {
          levelId: { $in: levelsCreatedByUser.map(level => level._id) }
        }
      },
      {
        $lookup: {
          from: LevelModel.collection.name,
          localField: 'levelId',
          foreignField: '_id',
          as: 'levelInfo',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                slug: 1,
                leastMoves: 1,
                gameId: 1,
              }
            }
          ]
        }
      },
      {
        $unwind: '$levelInfo'
      },
      {
        $project: {
          levelId: {
            _id: '$levelInfo._id',
            name: '$levelInfo.name',
            slug: '$levelInfo.slug',
            leastMoves: '$levelInfo.leastMoves',
            gameId: '$levelInfo.gameId',
          },
          _id: 1,
          userId: 1,
          ts: 1,
          score: 1,
          text: 1,
          gameId: 1,
        }
      }
    ];

    // If we have a requesting user, add a lookup to filter out reviewers who are blocked
    if (reqUser) {
      pipeline.push(
        // Lookup to check if the reviewer is blocked
        {
          $lookup: {
            from: GraphModel.collection.name,
            let: { reviewerId: '$userId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$source', reqUser._id] },
                      { $eq: ['$target', '$$reviewerId'] },
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
        // Only include reviews where the reviewer is not blocked
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

    // Complete the pipeline
    pipeline.push(
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
        $project: {
          levelId: {
            _id: 1,
            name: 1,
            slug: 1,
            leastMoves: 1,
            gameId: 1,
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
          text: 1,

        }
      },
      ...lookupPipelineUser
    );

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

export async function getReviewsForUserIdCount(gameId: GameId | undefined, id: string | string[] | undefined, reqUser: User | null = null) {
  try {
    // Create a userId ObjectId, handling potential invalid ids
    let userObjectId: Types.ObjectId;

    try {
      userObjectId = new Types.ObjectId(id?.toString());
    } catch (err) {
      // If the ID is invalid, return 0 as there can't be any levels by this user
      logger.error(`Invalid ObjectId in getReviewsForUserIdCount: ${id}`);

      return 0;
    }

    // Get levels created by the user
    const levelsByUser = await LevelModel.find<Level>({
      isDeleted: { $ne: true },
      isDraft: false,
      userId: userObjectId,
      ...(gameId !== undefined ? { gameId: gameId } : {})
    }, '_id');

    // If no levels, return 0
    if (!levelsByUser.length) {
      return 0;
    }

    // If no requesting user, do a simple count
    if (!reqUser) {
      return ReviewModel.countDocuments({
        levelId: { $in: levelsByUser.map(level => level._id) }
      });
    }

    // Use aggregation with a lookup to filter out reviews by blocked users
    const pipeline: PipelineStage[] = [
      {
        $match: {
          levelId: { $in: levelsByUser.map(level => level._id) }
        }
      },
      // Lookup to check if the reviewer is blocked
      {
        $lookup: {
          from: GraphModel.collection.name,
          let: { reviewerId: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$source', reqUser._id] },
                    { $eq: ['$target', '$$reviewerId'] },
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
      // Only include reviews where the reviewer is not blocked
      {
        $match: {
          'blockStatus': { $size: 0 }
        }
      },
      // Lookup the users to filter out deleted users
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
      // Filter out deleted users
      {
        $unwind: {
          path: '$userId',
        },
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
