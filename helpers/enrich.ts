import { GameId } from '@root/constants/GameId';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import { PipelineStage } from 'mongoose';
import cleanUser from '../lib/cleanUser';
import Campaign, { EnrichedCampaign } from '../models/db/campaign';
import Collection, { EnrichedCollection } from '../models/db/collection';
import Level, { EnrichedLevel } from '../models/db/level';
import Notification from '../models/db/notification';
import Stat from '../models/db/stat';
import User, { ReqUser } from '../models/db/user';
import { NotificationModel, StatModel, UserConfigModel, UserModel } from '../models/mongoose';
import { getEnrichNotificationPipelineStages } from './getEnrichNotificationPipelineStages';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function enrichReqUser(gameId: GameId, reqUser: User, filters?: any): Promise<ReqUser> {
  const enrichedReqUser: ReqUser = JSON.parse(JSON.stringify(reqUser)) as ReqUser;

  const notificationAgg = await NotificationModel.aggregate<Notification>([
    { $match: { userId: reqUser._id, /*gameId: gameId,*/ ...filters } }, // Not adding gameId on purpose so we can get all notifications for all games
    { $sort: { createdAt: -1 } },
    { $limit: 5 },
    ...getEnrichNotificationPipelineStages(reqUser._id)
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

  return enrichedReqUser;
}

interface EnrichUserConfigOptions {
  localField?: string;
  excludeCalcs?: boolean;
  includeChapter?: boolean;
  project?: Record<string, unknown>;
}

export function getEnrichUserConfigPipelineStage(gameId: GameId, { localField, excludeCalcs, includeChapter, project }: EnrichUserConfigOptions = {}): PipelineStage[] {
  if (!localField) {
    localField = '_id';
  }

  if (!project) {
    project = {};
  }

  const includeCalcsObject = !excludeCalcs ? {
    calcRecordsCount: 1,
    calcLevelsSolvedCount: 1,
    calcLevelsCompletedCount: 1,
    calcLevelsCreatedCount: 1,
    calcRankedSolves: 1,
  } : {};
  const includeChapterObject = includeChapter ? {
    chapterUnlocked: 1,
  } : {};

  return [{
    $lookup: {
      from: UserConfigModel.collection.name,
      localField: localField,
      foreignField: 'userId',
      as: 'config',
      pipeline: [
        { $match: { gameId: gameId } },
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
      path: '$config',
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
        // complete should be 1 if true, 0 if false
        'complete': { $cond: [{ $eq: ['$stat.moves', '$leastMoves'] }, 1, 0] }
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
          'complete': { $cond: [{ $eq: ['$stat.moves', '$leastMoves'] }, 1, 0] }
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
