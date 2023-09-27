import cleanUser from '@root/lib/cleanUser';
import { LEVEL_DEFAULT_PROJECTION } from '@root/models/schemas/levelSchema';
import { lookup } from 'dns';
import { PipelineStage, Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId } from '../../../helpers/apiWrapper';
import { enrichLevels, getEnrichLevelsPipelineSteps } from '../../../helpers/enrich';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Collection from '../../../models/db/collection';
import User from '../../../models/db/user';
import { CollectionModel, LevelModel, StatModel } from '../../../models/mongoose';

export default apiWrapper({
  GET: {
    query: {
      id: ValidObjectId(true)
    }
  } }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  await dbConnect();
  const token = req.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const collection = await getCollectionById(id as string, reqUser);

  if (!collection) {
    return res.status(404).json({
      error: 'Error finding Collection',
    });
  }

  return res.status(200).json(collection);
});

export async function getCollectionById(id: string, reqUser: User | null) {
  const collectionAgg = await CollectionModel.aggregate(([
    {
      $match: {
        _id: new Types.ObjectId(id),
      },
    },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'levels',
        foreignField: '_id',
        as: 'levels',
        pipeline: [
          {
            $match: {
              isDraft: false,
              isDeleted: {
                $ne: true
              }

            },
          },
          {

            $project: {
              ...LEVEL_DEFAULT_PROJECTION,
            },
          },

          ...getEnrichLevelsPipelineSteps(reqUser, '_id', ''),

        ],
      },
    },

  ] as PipelineStage[]));

  console.log(collectionAgg[0]);

  if (!collectionAgg || collectionAgg.length === 0) {
    return null;
  }

  (collectionAgg[0] as Collection).levels?.map(level => {
    cleanUser(level.userId);

    return level;
  });

  return collectionAgg[0];
}
