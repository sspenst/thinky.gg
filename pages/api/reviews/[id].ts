import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import isPro from '@root/helpers/isPro';
import cleanReview from '@root/lib/cleanReview';
import { getUserFromToken } from '@root/lib/withAuth';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { PipelineStage, Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import GraphType from '../../../constants/graphType';
import apiWrapper, { ValidObjectId } from '../../../helpers/apiWrapper';
import cleanUser from '../../../lib/cleanUser';
import { GraphModel, ReviewModel, StatModel, UserModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {
  query: {
    id: ValidObjectId(),
  },
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  const token = req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const pro = isPro(reqUser);

  const statAggPipeline: PipelineStage[] = [
    {
      $lookup: {
        from: StatModel.collection.name,
        let: { levelId: '$levelId', userId: '$userIdStr' },
        pipeline: [{
          $match: {
            $expr: {
              $and: [
                { $eq: ['$levelId', '$$levelId'] },
                { $eq: ['$userId', '$$userId'] },
              ],
            }
          },
        },
        {
          $project: {
            _id: 0,
            ts: 1,
            complete: 1,
            moves: 1
          }
        }
        ],
        as: 'stat',
      },
    },
    {
      $unwind: { path: '$stat', preserveNullAndEmptyArrays: true }
    }
  ];

  // Find user's associated stat for the level
  const userStat = reqUser ? await StatModel.findOne({
    levelId: new Types.ObjectId(id as string),
    userId: reqUser?._id
  }) : null;

  // Create the aggregation pipeline
  const pipeline: PipelineStage[] = [
    { $match: { levelId: new Types.ObjectId(id as string) } },
    { $sort: { ts: -1 } },
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
            },
          }
        ]
      }
    },
    {
      $set: {
        userIdStr: '$userId._id',
      }
    },
    {
      $unwind: '$userIdStr',
    }
  ];

  // Add filtering for blocked users if the requesting user exists
  if (reqUser) {
    // Add a lookup to find if the reviewer is blocked by the current user
    pipeline.push(
      {
        $lookup: {
          from: GraphModel.collection.name,
          let: { reviewerId: '$userIdStr' },
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
      // Filter out reviews where the reviewer is blocked
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

  // Complete the pipeline with remaining stages
  pipeline.push(
    ...(pro ? statAggPipeline : []),
    {
      $unset: ['userIdStr'],
    },
    { $unwind: '$userId' },
    ...getEnrichUserConfigPipelineStage('$gameId', { excludeCalcs: true, localField: 'userId._id', lookupAs: 'userId.config' })
  );

  // Execute the pipeline
  const reviewsAgg = await ReviewModel.aggregate(pipeline);

  reviewsAgg.forEach(review => {
    cleanReview(userStat?.complete, reqUser, review);
    cleanUser(review.userId);
  });

  return res.status(200).json(reviewsAgg);
});
