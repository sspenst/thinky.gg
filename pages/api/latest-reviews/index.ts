import { GameId } from '@root/constants/GameId';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import cleanReview from '@root/lib/cleanReview';
import { LEVEL_DEFAULT_PROJECTION, USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { PipelineStage } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import GraphType from '../../../constants/graphType';
import apiWrapper from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps, getEnrichUserConfigPipelineStage } from '../../../helpers/enrich';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Review from '../../../models/db/review';
import User from '../../../models/db/user';
import { GraphModel, LevelModel, ReviewModel, UserModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const token = req.cookies?.token;
  const gameId = getGameIdFromReq(req);
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const reviews = await getLatestReviews(gameId, reqUser);

  if (!reviews) {
    return res.status(500).json({
      error: 'Error finding Reviews',
    });
  }

  return res.status(200).json(reviews);
});

export async function getLatestReviews(gameId: GameId, reqUser: User | null = null) {
  await dbConnect();
  const lookupPipelineUser: PipelineStage[] = getEnrichLevelsPipelineSteps(reqUser);

  try {
    // Create the basic aggregation pipeline
    const pipeline: PipelineStage[] = [
      {
        $match: {
          isDeleted: { $ne: true },
          text: { $exists: true },
          gameId: gameId
        }
      },
      {
        $sort: {
          ts: -1,
        }
      },
      {
        $lookup: {
          from: LevelModel.collection.name,
          localField: 'levelId',
          foreignField: '_id',
          as: 'levelId',
          pipeline: [
            { $match: { isDeleted: { $ne: true } } },
            {
              $project: {
                ...LEVEL_DEFAULT_PROJECTION
              }
            },
            ...lookupPipelineUser as PipelineStage.Lookup[],
          ]
        }
      },
      {
        $unwind: '$levelId',
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
                ...USER_DEFAULT_PROJECTION
              }
            }
          ]
        }
      },
      {
        $unwind: {
          path: '$userId',
        }
      },
      ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'userId._id', lookupAs: 'userId.config' }),
    ];

    // If the requesting user exists, add stages to filter out reviews from blocked users
    if (reqUser) {
      // Filter out reviews where the reviewer is blocked by the requesting user
      pipeline.push(
        // Lookup to check if the reviewer is blocked
        {
          $lookup: {
            from: GraphModel.collection.name,
            let: { reviewerId: '$userId._id' },
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
            as: 'reviewerBlockStatus'
          }
        },
        // Only include reviews where the reviewer is not blocked
        {
          $match: {
            'reviewerBlockStatus': { $size: 0 }
          }
        },

        // Filter out reviews where the level author is blocked by the requesting user
        {
          $lookup: {
            from: GraphModel.collection.name,
            let: { levelAuthorId: '$levelId.userId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$source', reqUser._id] },
                      { $eq: ['$target', '$$levelAuthorId'] },
                      { $eq: ['$type', GraphType.BLOCK] },
                      { $eq: ['$sourceModel', 'User'] },
                      { $eq: ['$targetModel', 'User'] }
                    ]
                  }
                }
              }
            ],
            as: 'levelAuthorBlockStatus'
          }
        },
        // Only include reviews where the level author is not blocked
        {
          $match: {
            'levelAuthorBlockStatus': { $size: 0 }
          }
        },

        // Remove the block status fields from the output
        {
          $project: {
            reviewerBlockStatus: 0,
            levelAuthorBlockStatus: 0
          }
        }
      );
    }

    // Add the limit as the final stage
    pipeline.push({
      $limit: 7,
    });

    // Execute the aggregation pipeline
    const reviews = await ReviewModel.aggregate(pipeline);

    return reviews.map(review => {
      cleanReview(review.levelId.complete, reqUser, review);
      cleanUser(review.userId);

      return review;
    }) as Review[];
  } catch (err) {
    logger.error(err);

    return null;
  }
}
