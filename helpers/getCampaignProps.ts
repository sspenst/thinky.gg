import { GameId } from '@root/constants/GameId';
import { LEVEL_DEFAULT_PROJECTION, USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { PipelineStage, Types } from 'mongoose';
import cleanUser from '../lib/cleanUser';
import Campaign from '../models/db/campaign';
import { EnrichedCollection } from '../models/db/collection';
import Level, { EnrichedLevel } from '../models/db/level';
import User from '../models/db/user';
import { CampaignModel, CollectionModel, LevelModel, UserModel } from '../models/mongoose';
import { getEnrichLevelsPipelineSteps, getEnrichUserConfigPipelineStage } from './enrich';
import { getGameFromId } from './getGameIdFromReq';
import { logger } from './logger';

export interface CampaignProps {
  enrichedCollections: EnrichedCollection[];
  reqUser: User;
  solvedLevels: number;
  totalLevels: number;
}

export default async function getCampaignProps(gameId: GameId, reqUser: User, slug: string) {
  const game = getGameFromId(gameId);

  if (game.disableCampaign) {
    return {
      props: undefined,
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const campaignAgg = await CampaignModel.aggregate([
    {
      $match: {
        slug: slug,
        gameId: gameId,
      },
    },
    {
      $lookup: {
        from: CollectionModel.collection.name,
        localField: 'collections',
        foreignField: '_id',
        as: 'collectionsPopulated',
        pipeline: [
          {
            $lookup: {
              from: LevelModel.collection.name,
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
                ...getEnrichLevelsPipelineSteps(reqUser) as PipelineStage.Lookup[],
                {
                  $lookup: {
                    from: UserModel.collection.name,
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
                },
                ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'userId._id', lookupAs: 'userId.config' }),
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

  let solvedLevels = 0;
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

    const userSolvedCount = (enrichedCollection.levels as EnrichedLevel[]).filter((level: EnrichedLevel) => level.userMoves === level.leastMoves).length;

    enrichedCollection.userSolvedCount = userSolvedCount;
    solvedLevels += userSolvedCount;
    enrichedCollection.levelCount = enrichedCollection.levels.length;
    totalLevels += enrichedCollection.levels.length;
  }

  return {
    props: {
      enrichedCollections: JSON.parse(JSON.stringify(enrichedCollections)),
      reqUser: JSON.parse(JSON.stringify(reqUser)),
      solvedLevels: solvedLevels,
      totalLevels: totalLevels,
    } as CampaignProps,
  };
}
