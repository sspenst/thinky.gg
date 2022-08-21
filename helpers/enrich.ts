import Collection from '../models/db/collection';
import Level from '../models/db/level';
import Notification from '../models/db/notification';
import Stat from '../models/db/stat';
import User, { MyUser } from '../models/db/user';
import { NotificationModel, StatModel } from '../models/mongoose';
import { EnrichedCollection, EnrichedLevel } from '../pages/search';

export async function enrichCollection(collection: Collection, reqUser: User | null) {
  if (!reqUser) {
    return collection as EnrichedCollection;
  }

  const stats = await StatModel.find<Stat>({ userId: reqUser._id, levelId: { $in: collection.levels.map(level => level._id) } });
  let userCompletedCount = 0;

  collection.levels.forEach(level => {
    const stat = stats.find(stat => stat.levelId.equals(level._id));

    if (stat && stat.moves === level.leastMoves) {
      userCompletedCount++;
    }
  });

  const enrichedCollection = JSON.parse(JSON.stringify(collection)) as EnrichedCollection;

  enrichedCollection.levelCount = collection.levels.length;
  enrichedCollection.userCompletedCount = userCompletedCount;
  // NB: omit levels array to reduce object size
  enrichedCollection.levels = [];

  return enrichedCollection;
}

export async function enrichNotifications(req_user: User): Promise<MyUser> {
  const myuser: MyUser = JSON.parse(JSON.stringify(req_user)) as MyUser;
  // Unsure how to populate specific fields so having to do it app side...
  // https://stackoverflow.com/questions/73422190/mongoose-populate-withref-but-only-specific-fields
  const notifications = await NotificationModel.find({ userId: req_user._id }, {}, { lean: false, limit: 5 }).populate(['target', 'source']);

  const levelsToEnrich: EnrichedLevel[] = [];

  notifications.map(notification => {
    if (notification.targetModel === 'Level') {
      levelsToEnrich.push(notification.target as EnrichedLevel); // putting them in array to do one big batch...
    }

    return notification;
  });

  const enrichedLevels = await enrichLevels(levelsToEnrich, req_user);

  type LevelNotificationData = {
    _id: string,
    name: string,
    slug: string,
    ts: number,
    userMoves: number,
    userAttempts: number,
    userMovesTs: number,
  }
  type UserNotificationData ={
    _id: string,
    name: string,
    last_visited_at: number,
  }
  const NotificationModelMapping: Record<string, string[]> = {
    ['Level']: ['_id', 'name', 'slug', 'leastMoves', 'ts', 'userMoves', 'userAttempts', 'userMovesTs'],
    ['User']: ['_id', 'name', 'last_visited_at'],
  };
  const eNotifs: Notification[] = notifications.map((notification) => {
    notification = JSON.parse(JSON.stringify(notification));

    if (notification.targetModel === 'Level') {
      const which = enrichedLevels.find(level => level?._id.toString() === notification.target?._id.toString());

      if (which) {
        notification.target = which;
      }
    }

    // now strip out all the fields we don't need
    const fields = NotificationModelMapping[notification.targetModel];
    const target = notification.target;
    const newTarget: Record<string, any> = {};

    fields.forEach(field => {
      if (target && target[field]) {
        newTarget[field] = target[field];
      }
    });
    notification.target = newTarget;

    const source = notification.source;
    const newSource: Record<string, any> = {};

    fields.forEach(field => {
      if (source && source[field]) {
        newSource[field] = source[field];
      }
    });
    notification.source = newSource;

    return notification as Notification;
  });

  myuser.notifications = eNotifs !== undefined ? eNotifs : [];

  return myuser;
}

export async function enrichLevels(levels: Level[], reqUser: User | null) {
  if (!reqUser) {
    return levels as EnrichedLevel[];
  }

  const stats = await StatModel.find<Stat>({ userId: reqUser?._id, levelId: { $in: levels.map(level => level?._id) } });

  // map each stat to each level to create an EnrichedLevel
  return levels.map(level => {
    const stat = stats.find(stat => stat.levelId.equals(level?._id));
    const enrichedLevel = JSON.parse(JSON.stringify(level)) as EnrichedLevel;

    if (!enrichedLevel) {
      return level;
    }

    enrichedLevel.userAttempts = stat?.attempts;
    enrichedLevel.userMoves = stat?.moves;
    enrichedLevel.userMovesTs = stat?.ts;

    return enrichedLevel;
  });
}
