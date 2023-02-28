import { PipelineStage, Types } from 'mongoose';
import cleanUser from '../lib/cleanUser';
import Campaign from '../models/db/campaign';
import { EnrichedCollection } from '../models/db/collection';
import Level, { EnrichedLevel } from '../models/db/level';
import User from '../models/db/user';
import { CampaignModel } from '../models/mongoose';
import { LEVEL_DEFAULT_PROJECTION } from '../models/schemas/levelSchema';
import { USER_DEFAULT_PROJECTION } from '../models/schemas/userSchema';
import { getEnrichLevelsPipelineSteps } from './enrich';
import { logger } from './logger';

export interface CampaignProps {
  completedLevels: number;
  enrichedCollections: EnrichedCollection[];
  reqUser: User;
  totalLevels: number;
}

export default async function getCampaignProps(reqUser: User, slug: string) {
  const campaignAgg = await CampaignModel.aggregate([
    {
      $match: {
        slug: slug,
      },
    },
    {
      $lookup: {
        from: 'collections',
        localField: 'collections',
        foreignField: '_id',
        as: 'collectionsPopulated',
        pipeline: [
          {
            $lookup: {
              from: 'levels',
              localField: 'levels',
              foreignField: '_id',
              as: 'levelsPopulated',
              pipeline: [
                {
                  $match: {
                    isDraft: false
                  },
                },
                {
                  $project: {
                    ...LEVEL_DEFAULT_PROJECTION,
                  }
                },
                ...getEnrichLevelsPipelineSteps(reqUser, '_id', '') as PipelineStage.Lookup[],
                {
                  $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userId',
                    pipeline: [
                      {
                        $project: {
                          ...USER_DEFAULT_PROJECTION,
                        }
                      },
                    ]
                  },
                },
                {
                  $unwind: {
                    path: '$userId',
                    preserveNullAndEmptyArrays: true
                  }
                }
              ]
            },
          },
        ],
      }
    }
  ]);

  if (!campaignAgg || campaignAgg.length === 0) {
    logger.error(`CampaignModel.find returned null or empty for slug ${slug}`);

    return {
      notFound: true,
    };
  }

  const campaign = campaignAgg[0] as Campaign;

  // replace each collection[] object with collectionsPopulated[] object
  // convert this to a map with _id as key
  const collectionMap = new Map<string, EnrichedCollection>();

  if (campaign.collectionsPopulated) {
    for (const collection of campaign.collectionsPopulated) {
      collectionMap.set(collection._id.toString(), collection as EnrichedCollection);
    }
  }

  const enrichedCollections: EnrichedCollection[] = [];

  for (let j = 0; j < campaign.collections.length; j++) {
    const collection = collectionMap.get((campaign.collections[j] as Types.ObjectId).toString());

    // level may be null if it is a draft
    if (!collection) {
      continue;
    }

    enrichedCollections.push(collection);
  }

  let completedLevels = 0;
  let totalLevels = 0;

  for (let i = 0; i < enrichedCollections.length; i++) {
    const enrichedCollection = enrichedCollections[i] as EnrichedCollection & { levelsPopulated?: Level[] };

    // replace each level[] object with levelsPopulated[] object
    // convert this to a map with _id as key
    const levelMap = new Map<string, Level>();

    if (enrichedCollection.levelsPopulated) {
      for (const level of enrichedCollection.levelsPopulated) {
        levelMap.set(level._id.toString(), level);
      }
    }

    delete enrichedCollection.levelsPopulated;
    const collectionLevels: Level[] = [];

    for (let j = 0; j < enrichedCollection.levels.length; j++) {
      const level = levelMap.get((enrichedCollection.levels[j] as Types.ObjectId).toString());

      // level may be null if it is a draft
      if (!level) {
        continue;
      }

      cleanUser(level.userId);
      collectionLevels.push(level);
    }

    enrichedCollection.levels = collectionLevels;

    const userCompletedCount = (enrichedCollection.levels as EnrichedLevel[]).filter((level: EnrichedLevel) => level.userMoves === level.leastMoves).length;

    enrichedCollection.userCompletedCount = userCompletedCount;
    completedLevels += userCompletedCount;
    enrichedCollection.levelCount = enrichedCollection.levels.length;
    totalLevels += enrichedCollection.levels.length;
  }

  return {
    props: {
      completedLevels: completedLevels,
      enrichedCollections: JSON.parse(JSON.stringify(enrichedCollections)),
      reqUser: JSON.parse(JSON.stringify(reqUser)),
      totalLevels: totalLevels,
    } as CampaignProps,
  };
}
