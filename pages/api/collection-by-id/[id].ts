import cleanUser from '@root/lib/cleanUser';
import { LEVEL_DEFAULT_PROJECTION, LEVEL_SEARCH_DEFAULT_PROJECTION } from '@root/models/schemas/levelSchema';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import { FilterQuery, PipelineStage, Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId } from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps } from '../../../helpers/enrich';
import { getUserFromToken } from '../../../lib/withAuth';
import Collection, { EnrichedCollection } from '../../../models/db/collection';
import User from '../../../models/db/user';
import { CollectionModel, LevelModel, StatModel, UserModel } from '../../../models/mongoose';

export default apiWrapper({
  GET: {
    query: {
      id: ValidObjectId(true)
    }
  } }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  const token = req.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const collection = await getCollection({
    matchQuery: { _id: new Types.ObjectId(id as string) },
    reqUser,
    populateLevels: true,
  });

  if (!collection) {
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
  populateAroundLevel?: Types.ObjectId | string, // target level
}

/**
 * Query for a collection with optionally populated levels and stats.
 * Private collections are filtered out unless they were created by the reqUser.
 */
export async function getCollection(props: GetCollectionProps): Promise<Collection | null> {
  const collections = await getCollections(props);

  if (collections.length === 0) {
    return null;
  }

  return collections[0] as Collection;
}

// Create interface for partial collection where we have the fields targetLevelIndex and levelCount added

/**
 * Query collections with optionally populated levels and stats.
 * Private collections are filtered out unless they were created by the reqUser.
 */
export async function getCollections({ matchQuery, reqUser, includeDraft, populateLevels, populateAroundLevel }: GetCollectionProps): Promise<Collection[]> {
  const collectionAgg = await CollectionModel.aggregate<EnrichedCollection>(([
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
              // only match levels that are in the orderedIds array
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
              ...(includeDraft ? {
                isDraft: 1
              } : {}),
              ...(populateLevels ? {
                ...LEVEL_DEFAULT_PROJECTION
              } : {
                ...LEVEL_SEARCH_DEFAULT_PROJECTION
              })
            },
          },
          ...getEnrichLevelsPipelineSteps(reqUser, '_id', '') as PipelineStage[],
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
    ...populateAroundLevel ? [{
      // slice the levels array to include 10 before and 10 after the target level.. keep in mind that there may not be 10 levels before or after

      $addFields: {
        targetLevelIndex: {
          $indexOfArray: ['$levels._id', populateAroundLevel]
        },
        levels: {
          $slice: [
            '$levels',
            {
              $max: [
                {
                  $subtract: [
                    { $indexOfArray: ['$levels._id', populateAroundLevel] },
                    10
                  ]
                },
                0
              ]
            },
            20 // 10 levels before, the target level, and 10 levels after
          ]
        }
      }

    }] : [],
  ] as PipelineStage[]));

  collectionAgg.forEach(collection => {
    cleanUser(collection.userId);
    collection.levels?.forEach(level => cleanUser(level.userId));
  });

  return collectionAgg;
}
