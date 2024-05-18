import { GameId } from '@root/constants/GameId';
import cleanUser from '@root/lib/cleanUser';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import Notification from '@root/models/db/notification';
import { PipelineStage, Types } from 'mongoose';
import Campaign, { EnrichedCampaign } from '../models/db/campaign';
import Collection, { EnrichedCollection } from '../models/db/collection';
import Level, { EnrichedLevel } from '../models/db/level';
import Stat from '../models/db/stat';
import User, { ReqUser } from '../models/db/user';
import { AchievementModel, CollectionModel, LevelModel, NotificationModel, StatModel, UserConfigModel, UserModel } from '../models/mongoose';

export async function enrichCampaign(campaign: Campaign, reqUser: User | null) {
  const enrichedCampaign = JSON.parse(JSON.stringify(campaign)) as EnrichedCampaign;
  let userSolvedCount = 0;

  enrichedCampaign.levelCount = 0;

  for (let i = 0; i < enrichedCampaign.collections.length; i++) {
    const enrichedCollection = await enrichCollection(enrichedCampaign.collections[i], reqUser);

    enrichedCampaign.levelCount += enrichedCollection.levelCount;
    userSolvedCount += enrichedCollection.userSolvedCount;
  }

  if (reqUser) {
    enrichedCampaign.userSolvedCount = userSolvedCount;
  }

  return enrichedCampaign;
}

export async function enrichCollection(collection: Collection, reqUser: User | null) {
  const enrichedCollection = JSON.parse(JSON.stringify(collection)) as EnrichedCollection;

  enrichedCollection.levelCount = collection.levels.length;

  if (reqUser) {
    const stats = await StatModel.find<Stat>({ userId: reqUser._id, levelId: { $in: collection.levels.map(level => level._id) } });
    let userSolvedCount = 0;

    collection.levels.forEach(level => {
      const stat = stats.find(stat => stat.levelId.equals(level._id));

      if (stat && stat.moves === level.leastMoves) {
        userSolvedCount++;
      }
    });

    enrichedCollection.userSolvedCount = userSolvedCount;
  }

  return enrichedCollection;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEnrichedNotifications(reqUser: User, filters?: any, limit = 5, skip = 0) {
  const notifications = await NotificationModel.aggregate<Notification>([
    { $match: { userId: reqUser._id, ...filters } }, // not adding gameId on purpose so we can get all notifications for all games
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    ...getEnrichNotificationPipelineStages(reqUser._id)
  ]);

  notifications.forEach(notification => {
    if (notification.sourceModel === 'User' && notification.source) {
      cleanUser(notification.source as User);
    }

    if (notification.targetModel === 'User' && notification.target) {
      cleanUser(notification.target as User);
    }
  });

  return notifications;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function enrichReqUser(gameId: GameId, reqUser: User, filters?: any): Promise<ReqUser> {
  const enrichedReqUser: ReqUser = JSON.parse(JSON.stringify(reqUser)) as ReqUser;

  enrichedReqUser.notifications = await getEnrichedNotifications(reqUser, filters);

  return enrichedReqUser;
}

interface EnrichUserConfigOptions {
  excludeCalcs?: boolean;
  includeChapter?: boolean;
  localField?: string;
  lookupAs?: string;
  project?: Record<string, unknown>;
}

// use string for gameId to allow for easier use in aggregation pipelines
export function getEnrichUserConfigPipelineStage(gameId: GameId | string, { excludeCalcs, includeChapter, localField, lookupAs, project }: EnrichUserConfigOptions = {}) {
  if (!localField) {
    localField = '_id';
  }

  if (!lookupAs) {
    lookupAs = 'config';
  }

  if (!project) {
    project = {};
  }

  const includeCalcsObject = !excludeCalcs ? {
    calcLevelsCompletedCount: 1,
    calcLevelsCreatedCount: 1,
    calcLevelsSolvedCount: 1,
    calcRankedSolves: 1,
    calcRecordsCount: 1,
  } : {};
  const includeChapterObject = includeChapter ? {
    chapterUnlocked: 1,
  } : {};

  return [
    {
      $lookup: {
        from: UserConfigModel.collection.name,
        localField: localField,
        foreignField: 'userId',
        as: lookupAs,
        // using let for gameId allows looking up by GameId or by another property in the pipeline
        let: { gameId: gameId },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$gameId', '$$gameId']
              }
            }
          },
          { $project: {
            gameId: 1,
            roles: 1,
            ...includeCalcsObject,
            ...includeChapterObject,
            ...project
          } }
        ]
      },
    },
    {
      $unwind: {
        path: `$${lookupAs}`,
        preserveNullAndEmptyArrays: true,
      }
    },
  ];
}

export function getEnrichUserIdPipelineSteps(userIdField = 'userId', outputToField = 'userId') {
  const pipeline: PipelineStage[] = [
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: userIdField,
        foreignField: '_id',
        as: outputToField,
        pipeline: [
          { $project: { ...USER_DEFAULT_PROJECTION } },
        ]
      },
    },
    {
      $unwind: {
        path: '$' + outputToField,
        preserveNullAndEmptyArrays: true,
      }
    }
  ];

  return pipeline;
}

/**
 *
 * @param reqUser
 * @param levelField the field that contains the level object
 * @returns
 */
export function getEnrichLevelsPipelineSteps(reqUser?: User | null, levelField = ''): PipelineStage[] {
  if (!reqUser) {
    return [{ $unset: 'stat' }] as PipelineStage[];
  }

  const levelIdField = levelField ? `$${levelField}._id` : '$_id';
  const pipeline: PipelineStage[] = [
    {
      $lookup: {
        from: StatModel.collection.name,
        let: { levelId: levelIdField, userId: reqUser?._id },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$levelId', '$$levelId'] },
                  { $eq: ['$userId', '$$userId'] },
                ],
              },
            },
          },
        ],
        as: 'stat',
      }
    },
    {
      $unwind: {
        path: '$stat',
        preserveNullAndEmptyArrays: true,
      }
    },
  ];

  if (levelField === '') {
    pipeline.push({
      $set: {
        'complete': { $cond: [{ $eq: ['$stat.moves', '$leastMoves'] }, true, false] },
        'userAttempts': '$stat.attempts',
        'userMoves': '$stat.moves',
        'userMovesTs': '$stat.ts',
      }
    });
  } else {
    pipeline.push({
      $set: {
        [levelField]: {
          'complete': { $cond: [{ $eq: ['$stat.moves', `$${levelField}.leastMoves`] }, true, false] },
          'userAttempts': '$stat.attempts',
          'userMoves': '$stat.moves',
          'userMovesTs': '$stat.ts',
        }
      }
    });
  }

  pipeline.push({ $unset: 'stat' });

  return pipeline;
}

export async function enrichLevels(levels: Level[], reqUser: User | null) {
  if (!reqUser) {
    return levels as EnrichedLevel[];
  }

  const stats = await StatModel.find<Stat>({ userId: reqUser._id, levelId: { $in: levels.map(level => level._id) } });

  // map each stat to each level to create an EnrichedLevel
  return levels.map(level => {
    const stat = stats.find(stat => stat.levelId.equals(level._id));
    const enrichedLevel = JSON.parse(JSON.stringify(level)) as EnrichedLevel;

    enrichedLevel.userAttempts = stat?.attempts;
    enrichedLevel.userMoves = stat?.moves;
    enrichedLevel.userMovesTs = stat?.ts;

    return enrichedLevel;
  });
}

export function getEnrichNotificationPipelineStages(reqUser?: Types.ObjectId) {
  const statEnrich = reqUser ? [
    // now enrich the target levels where userId: reqUser._id
    // TODO: would we ever have notification where we need the source to be a level and if so would we need to enrich that too?
    // Currently all sources are User so not wasting looking up users for target
    {
      $lookup: {
        from: StatModel.collection.name,
        let: { levelId: '$targetLevel._id', userId: reqUser._id },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$levelId', '$$levelId'] },
                  { $eq: ['$userId', '$$userId'] },
                ],
              },
            },
          },
        ],
        as: 'targetLevelStats',
      }
    },
    {
      $unwind: {
        path: '$targetLevelStats',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $set: {
        'targetLevel.userAttempts': '$targetLevelStats.attempts',
        'targetLevel.userMoves': '$targetLevelStats.moves',
        'targetLevel.userMovesTs': '$targetLevelStats.ts',
      },
    },
  ] : [];

  return [
    {
      $lookup: {
        from: AchievementModel.collection.name,
        localField: 'source',
        foreignField: '_id',
        as: 'sourceAchievement',
      },
    },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'source',
        foreignField: '_id',
        as: 'sourceLevel',
      },
    },
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: 'source',
        foreignField: '_id',
        as: 'sourceUser',
      },
    },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'target',
        foreignField: '_id',
        as: 'targetLevel',
      },
    },
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: 'target',
        foreignField: '_id',
        as: 'targetUser',
      },
    },
    {
      $lookup: {
        from: CollectionModel.collection.name,
        localField: 'target',
        foreignField: '_id',
        as: 'targetCollection',
      },
    },
    {
      $unwind: {
        path: '$sourceAchievement',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$sourceLevel',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$sourceUser',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$targetLevel',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$targetUser',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$targetCollection',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        createdAt: 1,
        gameId: 1,
        message: 1,
        read: 1,
        sourceModel: 1,
        targetModel: 1,
        type: 1,
        updatedAt: 1,
        userId: 1,
        sourceAchievement: {
          _id: 1,
          type: 1,
          userId: 1,
        },
        sourceLevel: {
          _id: 1,
          leastMoves: 1,
          name: 1,
          slug: 1,
        },
        sourceUser: {
          ...USER_DEFAULT_PROJECTION,
        },
        targetCollection: {
          _id: 1,
          name: 1,
          slug: 1,
        },
        targetLevel: {
          _id: 1,
          leastMoves: 1,
          name: 1,
          slug: 1,
        },
        targetUser: {
          ...USER_DEFAULT_PROJECTION,
        },
      }
    },
    ...statEnrich,
    ...getEnrichUserConfigPipelineStage('$gameId', { excludeCalcs: true, localField: 'sourceUser._id', lookupAs: 'sourceUser.config' }),
    ...getEnrichUserConfigPipelineStage('$gameId', { excludeCalcs: true, localField: 'targetUser._id', lookupAs: 'targetUser.config' }),
    {
      // merge targetLevel and targetUser into target
      $addFields: {
        target: {
          $mergeObjects: [
            '$targetLevel',
            '$targetUser',
            '$targetCollection',
          ]
        },
        source: {
          $mergeObjects: [
            '$sourceAchievement',
            '$sourceLevel',
            '$sourceUser',
          ]
        }
      }
    },
    {
      $unset: [
        'sourceAchievement',
        'sourceLevel',
        'sourceUser',
        'targetLevel',
        'targetUser',
        'targetCollection',
        'targetLevelStats',
        'target.calc_playattempts_unique_users'
      ],
    },
  ] as PipelineStage[];
}
