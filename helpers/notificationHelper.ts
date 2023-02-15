import { ObjectId } from 'bson';
import { QueryOptions, SaveOptions } from 'mongoose';
import AchievementType from '../constants/achievementType';
import GraphType from '../constants/graphType';
import NotificationType from '../constants/notificationType';
import { AchievementModel, GraphModel, NotificationModel } from '../models/mongoose';
import { queuePushNotification } from '../pages/api/internal-jobs/worker';

export async function createNewWallPostNotification(type: NotificationType.NEW_WALL_POST |NotificationType.NEW_WALL_REPLY, userId: string | ObjectId, sourceUserId: string | ObjectId, targetUserId: string | ObjectId, message: string | ObjectId) {
  const id = new ObjectId();

  const [nm, ] = await Promise.all([
    NotificationModel.create([{
      _id: id,
      createdAt: new Date(),
      message: message,
      source: sourceUserId,
      sourceModel: 'User',
      target: targetUserId,
      targetModel: 'User',
      type: type,
      userId: userId,
      read: false,
    }]),
    queuePushNotification(id)
  ]);

  return nm;
}

export async function createNewFollowerNotification(follower: string | ObjectId, following: string | ObjectId) {
  const nm = await NotificationModel.findOneAndUpdate({
    source: follower,
    sourceModel: 'User',
    target: following,
    type: NotificationType.NEW_FOLLOWER,
    userId: following,
    // TODO: probably should check for createdAt < 1 day here...
  }, {
    message: '',
    source: follower,
    sourceModel: 'User',
    target: following,
    targetModel: 'User',
    type: NotificationType.NEW_FOLLOWER,
    userId: following,
  }, {
    upsert: true,
    new: true,
  });

  await queuePushNotification(nm._id);
}

export async function createNewReviewOnYourLevelNotification(levelUserId: string | ObjectId, sourceUserId: string | ObjectId, targetLevelId: string | ObjectId, message: string | ObjectId) {
  const nm = await NotificationModel.findOneAndUpdate({
    source: sourceUserId,
    sourceModel: 'User',
    target: targetLevelId,
    type: NotificationType.NEW_REVIEW_ON_YOUR_LEVEL,
    userId: levelUserId,
  }, {
    message: message,
    source: sourceUserId,
    sourceModel: 'User',
    target: targetLevelId,
    targetModel: 'Level',
    type: NotificationType.NEW_REVIEW_ON_YOUR_LEVEL,
    userId: levelUserId,
  }, {
    upsert: true,
    new: true,
  });

  await queuePushNotification(nm._id);

  return nm;
}

export async function createNewAchievement(achievementType: AchievementType, userId: ObjectId, options: SaveOptions) {
  const achievement = await AchievementModel.findOneAndUpdate({
    type: achievementType,
    userId: userId,
  }, {
    type: achievementType,
    userId: userId,
  }, {
    upsert: true,
    new: true,
    ...options,
  });

  const nm = await NotificationModel.findOneAndUpdate({
    source: achievement._id,
    sourceModel: 'Achievement',
    target: userId,
    targetModel: 'User',
    type: NotificationType.NEW_ACHIEVEMENT,
    userId: userId,
  }, {
    source: achievement._id,
    sourceModel: 'Achievement',
    target: userId,
    targetModel: 'User',
    type: NotificationType.NEW_ACHIEVEMENT,
    userId: userId,
  }, {
    upsert: true,
    new: true,
    ...options,
  });

  await queuePushNotification(nm._id);

  return achievement;
}

export async function createNewLevelNotifications(userIdWhoCreatedLevel: ObjectId, targetLevelId: ObjectId, message?: string | ObjectId, options?: SaveOptions) {
  const usersThatFollow = await GraphModel.find({
    target: userIdWhoCreatedLevel,
    targetModel: 'User',
    type: GraphType.FOLLOW,
  }, 'source', {
    lean: true,
    ...options,
  });

  const ids: ObjectId[] = [];
  const createRecords = usersThatFollow.map(user => {
    const id = new ObjectId();

    ids.push(id);

    return {
      _id: id,
      message: message,
      source: userIdWhoCreatedLevel,
      sourceModel: 'User',
      target: targetLevelId,
      targetModel: 'Level',
      type: NotificationType.NEW_LEVEL,
      userId: user.source._id,
    };
  });

  // TODO: can probably generate all the ids in the above map and then wrap in a Promise.all
  const [nm,] = await Promise.all([
    await NotificationModel.create(createRecords, options),
    ...ids.map(id => queuePushNotification(id))
  ]);

  return nm;
}

export async function createNewRecordOnALevelYouBeatNotifications(userIds: string[] | ObjectId[], userIdWhoSetNewRecord: string | ObjectId, targetLevelId: string | ObjectId, message?: string | ObjectId, options?: SaveOptions) {
  const ids: ObjectId[] = [];
  const createRecords = userIds.map(userId => {
    const id = new ObjectId();

    ids.push(id);

    return {
      _id: id,
      message: message,
      source: userIdWhoSetNewRecord,
      sourceModel: 'User',
      target: targetLevelId,
      targetModel: 'Level',
      type: NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_BEAT,
      userId: userId,
    };
  });

  const [nm, ] = await Promise.all([
    NotificationModel.create(createRecords, options),
    ...ids.map(id => queuePushNotification(id))
  ]);

  return nm;
}

export async function clearNotifications(userId?: string | ObjectId, sourceId?: string | ObjectId, targetId?: string | ObjectId, type?: NotificationType, options?: QueryOptions) {
  const obj: {userId?: string | ObjectId, target?: string | ObjectId, source?: string | ObjectId, type?: NotificationType} = {};

  if (userId) {
    obj['userId'] = userId;
  }

  if (targetId) {
    obj['target'] = targetId;
  }

  if (sourceId) {
    obj['source'] = sourceId;
  }

  if (type) {
    obj['type'] = type;
  }

  const deleted = await NotificationModel.deleteMany({
    ...obj,
  }, options);

  // TODO: should we loop through all queuemessages with the deletedIds and remove them? Maybe not necessary...

  return deleted;
}
