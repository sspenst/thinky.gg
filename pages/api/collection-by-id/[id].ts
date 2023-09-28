import cleanUser from '@root/lib/cleanUser';
import { LEVEL_DEFAULT_PROJECTION } from '@root/models/schemas/levelSchema';
import { PipelineStage, Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId } from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps } from '../../../helpers/enrich';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Collection from '../../../models/db/collection';
import User from '../../../models/db/user';
import { CollectionModel, LevelModel } from '../../../models/mongoose';

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
      $addFields: {
        'levelsWithSort': {
          $map: {
            input: '$levels',
            as: 'item',
            in: {
              _id: '$$item', // making levels an array of objects with _id
            }
          }
        }
      }
    },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'levelsWithSort._id',
        foreignField: '_id',
        let: { 'orderedIds': '$levelsWithSort._id' },

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
            $addFields: {
              sort: {
                $indexOfArray: [ '$$orderedIds', '$_id' ]
              }
            }
          },
          {
            $sort: {
              sort: 1
            }
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
    {
      $set: {
        levelsWithSort: 0
      }
    }
  ] as PipelineStage[]));

  if (!collectionAgg || collectionAgg.length === 0) {
    return null;
  }

  (collectionAgg[0] as Collection).levels?.map(level => {
    cleanUser(level.userId);

    return level;
  });

  return collectionAgg[0];
}
