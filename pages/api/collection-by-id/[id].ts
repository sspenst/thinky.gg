import cleanUser from '@root/lib/cleanUser';
import { LEVEL_DEFAULT_PROJECTION } from '@root/models/schemas/levelSchema';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import { FilterQuery, PipelineStage, Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId } from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps } from '../../../helpers/enrich';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Collection from '../../../models/db/collection';
import User from '../../../models/db/user';
import { CollectionModel, LevelModel, StatModel, UserModel } from '../../../models/mongoose';

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
  const collection = await getCollection({
    matchQuery: { _id: new Types.ObjectId(id as string) },
    reqUser,
    populateLevels: true,
  });

  if (!collection || (collection.isPrivate && collection.userId._id.toString() !== reqUser?._id.toString())) {
    return res.status(404).json({
      error: 'Error finding Collection',
    });
  }

  return res.status(200).json(collection);
});

interface GetCollectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matchQuery: FilterQuery<any>,
  reqUser: User | null,
  includeDraft?: boolean,
  populateLevels?: boolean,
}

export async function getCollection(props: GetCollectionProps): Promise<Collection | null> {
  const collections = await getCollections(props);

  if (collections.length === 0) {
    return null;
  }

  return collections[0] as Collection;
}

export async function getCollections({ matchQuery, reqUser, includeDraft, populateLevels }: GetCollectionProps): Promise<Collection[]> {
  const collectionAgg = await CollectionModel.aggregate<Collection>(([
    {
      $match: {
        // filter out private collections unless the userId matches reqUser
        $or: [
          { isPrivate: { $ne: true } },
          {
            $and: [
              { isPrivate: true },
              { userId: reqUser?._id }
            ]
          }
        ],
        ...matchQuery,
      }
    },
    {
      // populate user for collection
      $lookup: {
        from: UserModel.collection.name,
        localField: 'userId',
        foreignField: '_id',
        as: 'userId',
        pipeline: [
          { $project: USER_DEFAULT_PROJECTION },
        ]
      },
    },
    {
      $unwind: {
        path: '$userId',
        preserveNullAndEmptyArrays: true,
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
              ...(!includeDraft ? {
                isDraft: {
                  $ne: true
                }
              } : undefined),
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
              leastMoves: 1,
              ...(includeDraft ? {
                isDraft: 1
              } : {}),
              ...(populateLevels ? {
                ...LEVEL_DEFAULT_PROJECTION
              } : {})
            },
          },
          ...(populateLevels ? getEnrichLevelsPipelineSteps(reqUser, '_id', '') : [{
            $lookup: {
              from: StatModel.collection.name,
              localField: '_id',
              foreignField: 'levelId',
              as: 'stats',
              pipeline: [
                {
                  $match: {
                    userId: reqUser?._id,
                    complete: true
                  },
                },
                {
                  $project: {
                    _id: 0,
                    // project complete to 1 if it exists, otherwise 0
                    complete: {
                      $cond: {
                        if: { $eq: ['$complete', true] },
                        then: 1,
                        else: 0
                      }
                    }
                  }
                }
              ]
            },
          }]),
          {
            $unwind: {
              path: '$stats',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            // populate user
            $lookup: {
              from: UserModel.collection.name,
              localField: 'userId',
              foreignField: '_id',
              as: 'userId',
              pipeline: [
                { $project: USER_DEFAULT_PROJECTION },
              ]
            },
          },
          {
            $unwind: {
              path: '$userId',
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },
    {
      $unset: 'levelsWithSort'
    },
    {
      $addFields: {
        levelCount: {
          $size: '$levels'
        },
        userSolvedCount: {
          $sum: '$levels.stats.complete'
        }
      }
    },
    ...(!populateLevels ? [{ $unset: 'levels' }] : []),
  ] as PipelineStage[]));

  collectionAgg.forEach(collection => {
    cleanUser(collection.userId);
    collection.levels?.forEach(level => cleanUser(level.userId));
  });

  return collectionAgg;
}
