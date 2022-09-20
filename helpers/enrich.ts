import cleanUser from '../lib/cleanUser';
import Campaign, { EnrichedCampaign } from '../models/db/campaign';
import Collection, { EnrichedCollection } from '../models/db/collection';
import Level, { EnrichedLevel } from '../models/db/level';
import Notification from '../models/db/notification';
import Stat from '../models/db/stat';
import User, { ReqUser } from '../models/db/user';
import { NotificationModel, StatModel } from '../models/mongoose';

export async function enrichCampaign(campaign: Campaign, reqUser: User | null) {
  const enrichedCampaign = JSON.parse(JSON.stringify(campaign)) as EnrichedCampaign;
  let userCompletedCount = 0;

  enrichedCampaign.levelCount = 0;

  for (let i = 0; i < enrichedCampaign.collections.length; i++) {
    const enrichedCollection = await enrichCollection(enrichedCampaign.collections[i], reqUser);

    enrichedCampaign.levelCount += enrichedCollection.levelCount;
    userCompletedCount += enrichedCollection.userCompletedCount;
  }

  if (reqUser) {
    enrichedCampaign.userCompletedCount = userCompletedCount;
  }

  return enrichedCampaign;
}

export async function enrichCollection(collection: Collection, reqUser: User | null) {
  const enrichedCollection = JSON.parse(JSON.stringify(collection)) as EnrichedCollection;

  enrichedCollection.levelCount = collection.levels.length;
  // NB: omit levels array to reduce object size
  enrichedCollection.levels = [];

  if (reqUser) {
    const stats = await StatModel.find<Stat>({ userId: reqUser._id, levelId: { $in: collection.levels.map(level => level._id) } });
    let userCompletedCount = 0;

    collection.levels.forEach(level => {
      const stat = stats.find(stat => stat.levelId.equals(level._id));

      if (stat && stat.moves === level.leastMoves) {
        userCompletedCount++;
      }
    });

    enrichedCollection.userCompletedCount = userCompletedCount;
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
    ['Level']: ['_id', 'leastMoves', 'name', 'slug', 'ts', 'userAttempts', 'userMoves', 'userMovesTs'],
    ['User']: ['_id', 'avatarUpdatedAt', 'hideStatus', 'name', 'last_visited_at'],
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
    const targetFields = NotificationModelMapping[notification.targetModel];
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

    const sourceFields = NotificationModelMapping[notification.sourceModel];
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

export async function enrichReqUser(reqUser: User): Promise<ReqUser> {
  const enrichedReqUser: ReqUser = JSON.parse(JSON.stringify(reqUser)) as ReqUser;
  // Unsure how to populate specific fields so having to do it app side...
  // https://stackoverflow.com/questions/73422190/mongoose-populate-withref-but-only-specific-fields
  const notifications = await NotificationModel.find({ userId: reqUser._id }, {}, { lean: false, limit: 5, sort: { createdAt: -1 } }).populate(['target', 'source']);

  enrichedReqUser.notifications = await enrichNotifications(notifications as Notification[], reqUser);

  return enrichedReqUser;
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
