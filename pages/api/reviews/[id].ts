import isPro from '@root/helpers/isPro';
import { getUserFromToken } from '@root/lib/withAuth';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import { PipelineStage, Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId } from '../../../helpers/apiWrapper';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import { ReviewModel, StatModel, UserModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {
  query: {
    id: ValidObjectId(),
  },
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  await dbConnect();

  const token = req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;

  const pro = isPro(reqUser);

  const statAggPipeline = [
    {
      $lookup: {
        from: StatModel.collection.name,
        // Search through stats for where the levelId matches the levelId of the review and the userId matches the userId of the review
        // note that userId._id is an ObjectId, not a string
        let: { levelId: '$levelId', userId: '$userIdStr' },
        pipeline: [{
          $match: {
            $expr: {
              $and: [
                { $eq: ['$levelId', '$$levelId'] },
                // $eq: ['$userId', '$$userId'] is not valid because $userId is an ObjectId and $$userId is a string
                // so we need to do this instead, refer to the _id field of the user
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
  // do the same query but as an aggregation
  const aggQuery = [
    { $match: { levelId: new Types.ObjectId(id as string) } },
    { $sort: { ts: -1 } },
    { $lookup: { from: UserModel.collection.name, localField: 'userId', foreignField: '_id', as: 'userId',
      pipeline: [
        {
          $project: {
            ...USER_DEFAULT_PROJECTION
          },
        }
      ]
    } },
    {
      $set: {
        userIdStr: '$userId._id',
      }
    },
    {
      $unwind: '$userIdStr',
    },
    ...pro ? statAggPipeline : [],
    {
      $unset: ['userIdStr'],
    },
    { $unwind: '$userId' },

  ];
  const reviewsAgg = await ReviewModel.aggregate(aggQuery as PipelineStage[]);

  reviewsAgg.forEach(review => cleanUser(review.userId));

  return res.status(200).json(reviewsAgg);
});
