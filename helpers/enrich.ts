import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import { PipelineStage } from 'mongoose';
import cleanUser from '../lib/cleanUser';
import Campaign, { EnrichedCampaign } from '../models/db/campaign';
import Collection, { EnrichedCollection } from '../models/db/collection';
import Level, { EnrichedLevel } from '../models/db/level';
import Notification from '../models/db/notification';
import Stat from '../models/db/stat';
import User, { ReqUser } from '../models/db/user';
import { AchievementModel, CollectionModel, LevelModel, NotificationModel, StatModel, UserModel } from '../models/mongoose';

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

export async function enrichNotifications(notifications: Notification[], reqUser: User) {
  const levelsToEnrich: EnrichedLevel[] = [];

  // remove nulls
  notifications.map(notification => {
    if (notification.targetModel === 'Level') {
      if (notification.target as EnrichedLevel) {
        levelsToEnrich.push(notification.target as EnrichedLevel); // putting them in array to do one big batch...
      }
    }

    return notification;
  });

  const enrichedLevels = await enrichLevels(levelsToEnrich, reqUser);

  const NotificationModelMapping: Record<string, string[]> = {
    ['Achievement']: ['_id', 'type', 'userId'],
    ['Level']: ['_id', 'leastMoves', 'name', 'slug', 'ts', 'userAttempts', 'userMoves', 'userMovesTs'],
    ['User']: ['_id', 'avatarUpdatedAt', 'hideStatus', 'name', 'last_visited_at'],
    ['Collection']: ['_id', 'name', 'slug'],
  };

  const eNotifs: Notification[] = notifications.map((notification) => {
    notification = JSON.parse(JSON.stringify(notification));

    if (notification.targetModel === 'Level') {
      if (notification.target as EnrichedLevel) {
        const enrichedLevel = enrichedLevels.find(level => level._id.toString() === notification.target._id.toString());

        if (enrichedLevel) {
          notification.target = enrichedLevel;
        }
      }
    }

    // now strip out all the fields we don't need
    const targetFields = NotificationModelMapping[notification.targetModel] ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const target = notification.target as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newTarget: Record<string, any> = {};

    targetFields.forEach(field => {
      if (target && target[field]) {
        newTarget[field] = target[field];
      }
    });

    notification.target = newTarget as Notification['target'];

    // NB: no existing notification types have the user as a target
    // should remove this ignore statment once these notification types are added
    /* istanbul ignore next */
    if (notification.targetModel === 'User') {
      cleanUser(notification.target as User);
    }

    const sourceFields = NotificationModelMapping[notification.sourceModel] ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const source = notification.source as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newSource: Record<string, any> = {};

    sourceFields.forEach(field => {
      if (source && source[field]) {
        newSource[field] = source[field];
      }
    });

    notification.source = newSource as User;

    if (notification.sourceModel === 'User') {
      cleanUser(notification.source);
    }

    return notification as Notification;
  });

  return eNotifs;
}

export function getEnrichNotificationPipelineStages(reqUser?: User) {
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
          _id: 1,
          avatarUpdatedAt: 1,
          hideStatus: 1,
          last_visited_at: 1,
          name: 1,
        },
        targetLevel: {
          _id: 1,
          leastMoves: 1,
          name: 1,
          slug: 1,
        },
        targetUser: {
          _id: 1,
          avatarUpdatedAt: 1,
          hideStatus: 1,
          last_visited_at: 1,
          name: 1,
        },
        targetCollection: {
          _id: 1,
          slug: 1,
          name: 1,
        },
      }
    },
    ...statEnrich,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function enrichReqUser(reqUser: User, filters?: any): Promise<ReqUser> {
  const bench = Date.now();
  const enrichedReqUser: ReqUser = JSON.parse(JSON.stringify(reqUser)) as ReqUser;

  const notificationAgg = await NotificationModel.aggregate<Notification>([
    { $match: { userId: reqUser._id, ...filters } },
    { $sort: { createdAt: -1 } },
    { $limit: 5 },
    ...getEnrichNotificationPipelineStages(reqUser)
  ]);

  notificationAgg.forEach(notification => {
    if (notification.sourceModel === 'User' && notification.source) {
      cleanUser(notification.source as User);
    }

    if (notification.targetModel === 'User' && notification.target) {
      cleanUser(notification.target as User);
    }
  });

  enrichedReqUser.notifications = notificationAgg;

  console.log('enrichReq time taken ', Date.now() - bench, 'ms');

  return enrichedReqUser;
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
 * @param levelIdField
 * @param outputToField Leave blank to output to root of object
 * @returns
 */
export function getEnrichLevelsPipelineSteps(reqUser?: User | null, levelIdField = 'levelId._id', outputToField = 'levelId'): PipelineStage[] {
  if (!reqUser) {
    return [{ $unset: 'stat' }] as PipelineStage[];
  }

  if (outputToField === '') {
    outputToField = 'gotoroot';
  }

  const pipeline: PipelineStage[] = [
    {
      $lookup: {
        from: StatModel.collection.name,
        let: { levelId: '$' + levelIdField, userId: reqUser?._id },
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

  if (outputToField === 'gotoroot') {
    pipeline.push({
      $set: {
        'userAttempts': '$stat.attempts',
        'userMoves': '$stat.moves',
        'userMovesTs': '$stat.ts',
      }
    }
    );
    pipeline.push({
      $unset: '' + outputToField
    });
  } else {
    pipeline.push({
      $set: {
        [outputToField]: {
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
