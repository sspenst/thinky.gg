import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import cleanUser from '@root/lib/cleanUser';
import { LEVEL_DEFAULT_PROJECTION, LEVEL_SEARCH_DEFAULT_PROJECTION, USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { FilterQuery, PipelineStage, Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidEnum, ValidObjectId } from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps, getEnrichUserConfigPipelineStage } from '../../../helpers/enrich';
import { getUserFromToken } from '../../../lib/withAuth';
import Collection, { EnrichedCollection } from '../../../models/db/collection';
import User from '../../../models/db/user';
import { CollectionModel, LevelModel, UserModel } from '../../../models/mongoose';

export default apiWrapper({
  GET: {
    query: {
      id: ValidObjectId(true),
      populateAroundId: ValidObjectId(false),
      populateLevelDirection: ValidEnum(['before', 'after', 'around'], false),
    }
  } }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id, populateAroundId, populateLevelDirection } = req.query;
  const token = req.cookies?.token;
  const gameId = getGameIdFromReq(req);
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const collection = await getCollection({
    matchQuery: { _id: new Types.ObjectId(id as string), gameId: gameId },
    ...(populateAroundId ? { populateAroundId: new Types.ObjectId(populateAroundId as string) } : {}),
    ...(populateLevelDirection ? { populateLevelDirection: populateLevelDirection as 'before' | 'after' | 'around' } : {}),
    reqUser,
  });

  if (!collection) {
    return res.status(404).json({
      error: 'Error finding Collection',
    });
  }

  return res.status(200).json(collection);
});

interface GetCollectionProps {
  includeDraft?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matchQuery: FilterQuery<any>;
  populateAroundId?: Types.ObjectId; // target level
  populateAroundSlug?: string; // target level
  populateLevelData?: boolean;
  populateLevelDirection?: 'before' | 'after' | 'around';
  reqUser: User | null;
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

/**
 * Query collections with optionally populated levels and stats.
 * Private collections are filtered out unless they were created by the reqUser.
 */
export async function getCollections({
  includeDraft,
  matchQuery,
  populateAroundId,
  populateAroundSlug,
  populateLevelData = true,
  populateLevelDirection,
  reqUser,
}: GetCollectionProps): Promise<Collection[]> {
  const populateLevelCount = 5;
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
    ...getEnrichUserConfigPipelineStage('$gameId', { excludeCalcs: true, localField: 'userId._id', lookupAs: 'userId.config' }),
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
              ...(populateLevelData ? {
                ...LEVEL_DEFAULT_PROJECTION
              } : {
                ...LEVEL_SEARCH_DEFAULT_PROJECTION
              })
            },
          },
          ...getEnrichLevelsPipelineSteps(reqUser) as PipelineStage[],
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
          ...getEnrichUserConfigPipelineStage('$gameId', { excludeCalcs: true, localField: 'userId._id', lookupAs: 'userId.config' }),
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
          $size: {
            $filter: {
              input: '$levels',
              as: 'level',
              cond: { $eq: ['$$level.complete', true] }
            }
          }
        }
      }
    },
    ...(populateAroundId || populateAroundSlug ? [
      {
        $addFields: {
          targetLevelIndex: {
            $cond: {
              if: populateAroundId,
              then: { $indexOfArray: ['$levels._id', populateAroundId] },
              else: { $indexOfArray: ['$levels.slug', populateAroundSlug] },
            }
          },
        },
      },
      {
        $addFields: {
          levels: {
            // if the target level is not found, return empty array
            // this can happen if an invalid cid is passed in the URL, or if the target level is removed from the collection
            $cond: {
              if: { $lt: ['$targetLevelIndex', 0] },
              then: [],
              else: {
                $cond: {
                  if: { $eq: [populateLevelDirection, 'before'] },
                  // populate the target level + at most 5 levels before
                  then: {
                    $slice: [
                      '$levels',
                      { $max: [0, { $subtract: ['$targetLevelIndex', populateLevelCount] }] },
                      { $min: [populateLevelCount + 1, { $add: ['$targetLevelIndex', 1] }] }
                    ]
                  },
                  else: {
                    $cond: {
                      if: { $eq: [populateLevelDirection, 'after'] },
                      // populate the target level + at most 5 levels after
                      then: {
                        $slice: [
                          '$levels',
                          '$targetLevelIndex',
                          { $min: [populateLevelCount + 1, { $subtract: [{ $size: '$levels' }, '$targetLevelIndex'] }] }
                        ]
                      },
                      else: { // 'around'
                        // populate the target level + at most 5 levels before and 5 levels after
                        $slice: [
                          '$levels',
                          { $max: [0, { $subtract: ['$targetLevelIndex', populateLevelCount] }] },
                          { $min: [populateLevelCount * 2 + 1, { $size: '$levels' }] },
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
    ] : []),
  ] as PipelineStage[]));

  collectionAgg.forEach(collection => {
    cleanUser(collection.userId);
    collection.levels?.forEach(level => cleanUser(level.userId));
  });

  return collectionAgg;
}
