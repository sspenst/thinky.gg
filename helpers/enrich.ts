import Collection from '../models/db/collection';
import Level from '../models/db/level';
import Notification from '../models/db/notification';
import Stat from '../models/db/stat';
import User, { ReqUser } from '../models/db/user';
import { NotificationModel, StatModel } from '../models/mongoose';
import { EnrichedCollection, EnrichedLevel } from '../pages/search';

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

export async function enrichReqUser(reqUser: User): Promise<ReqUser> {
  const enrichedReqUser: ReqUser = JSON.parse(JSON.stringify(reqUser)) as ReqUser;
  // Unsure how to populate specific fields so having to do it app side...
  // https://stackoverflow.com/questions/73422190/mongoose-populate-withref-but-only-specific-fields
  const notifications = await NotificationModel.find({ userId: reqUser._id }, {}, { lean: false, limit: 5, sort: { createdAt: -1 } }).populate(['target', 'source']);

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
    ['Level']: ['_id', 'name', 'slug', 'leastMoves', 'ts', 'userMoves', 'userAttempts', 'userMovesTs'],
    ['User']: ['_id', 'name', 'last_visited_at'],
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
    const fields = NotificationModelMapping[notification.targetModel];
    const target = notification.target;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newTarget: Record<string, any> = {};

    fields.forEach(field => {
      if (target && target[field]) {
        newTarget[field] = target[field];
      }
    });

    notification.target = newTarget;

    const source = notification.source;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newSource: Record<string, any> = {};

    fields.forEach(field => {
      if (source && source[field]) {
        newSource[field] = source[field];
      }
    });

    notification.source = newSource;

    return notification as Notification;
  });

  enrichedReqUser.notifications = eNotifs !== undefined ? eNotifs : [];

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
