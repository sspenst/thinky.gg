import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import { QueryOptions, SaveOptions, Types } from 'mongoose';
import AchievementType from '../constants/achievements/achievementType';
import GraphType from '../constants/graphType';
import NotificationType from '../constants/notificationType';
import Achievement from '../models/db/achievement';
import { AchievementModel, GraphModel, NotificationModel } from '../models/mongoose';
import { queuePushNotification } from '../pages/api/internal-jobs/worker';

export async function createNewWallPostNotification(type: NotificationType.NEW_WALL_POST |NotificationType.NEW_WALL_REPLY, userId: string | Types.ObjectId, sourceUserId: string | Types.ObjectId, targetUserId: string | Types.ObjectId, message: string) {
  const id = new Types.ObjectId();

  const [notification] = await Promise.all([
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
    queuePushNotification(id),
  ]);

  return notification;
}

export async function createNewProUserNotification(userId: string | Types.ObjectId, fromUser?: string | Types.ObjectId, message?: string) {
  const notification = await NotificationModel.findOneAndUpdate({
    source: fromUser || userId,
    sourceModel: 'User',
    target: userId,
    targetModel: 'User',
    type: NotificationType.UPGRADED_TO_PRO,
    // TODO: probably should check for createdAt < 1 day here...
  }, {
    source: fromUser || userId,
    sourceModel: 'User',
    target: userId,
    targetModel: 'User',
    message: message,
    type: NotificationType.UPGRADED_TO_PRO,
    userId: userId,
    read: false,
  }, {
    upsert: true,
    new: true,
  });

  await queuePushNotification(notification._id);

  return notification;
}

export async function createNewFollowerNotification(follower: string | Types.ObjectId, following: string | Types.ObjectId) {
  const notification = await NotificationModel.findOneAndUpdate({
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

  await queuePushNotification(notification._id);
}

export async function createNewReviewOnYourLevelNotification(levelUserId: string | Types.ObjectId, sourceUserId: string | Types.ObjectId, targetLevelId: string | Types.ObjectId, score: string, hasText?: boolean) {
  const message = `${String(score)},${String(!!hasText)}`;

  const notification = await NotificationModel.findOneAndUpdate({
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

  await queuePushNotification(notification._id);

  return notification;
}

export async function createNewAchievement(achievementType: AchievementType, userId: Types.ObjectId, disablePushNotification?: boolean, options?: SaveOptions) {
  const achievement = await AchievementModel.findOneAndUpdate<Achievement>({
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

  const notification = await NotificationModel.findOneAndUpdate({
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

  if (!disablePushNotification) {
    await queuePushNotification(notification._id);
  }

  return achievement;
}

export async function createNewLevelAddedToCollectionNotification(actor: User, level: Level, targetCollectionIds: string[] | Types.ObjectId[]) {
  // let level
  const ids: Types.ObjectId[] = [];
  const createRecords = targetCollectionIds.map(collection => {
    const id = new Types.ObjectId();

    ids.push(id);

    return {
      _id: id,
      message: actor._id,
      source: level._id,
      sourceModel: 'Level',
      target: collection,
      targetModel: 'Collection',
      type: NotificationType.NEW_LEVEL_ADDED_TO_COLLECTION,
      userId: level.userId,
    };
  });

  const [nm,] = await Promise.all([
    await NotificationModel.create(createRecords),
    ...ids.map(id => queuePushNotification(id))
  ]);

  return nm;
}

export async function createNewLevelNotifications(userIdWhoCreatedLevel: Types.ObjectId, targetLevelId: Types.ObjectId, message?: string, options?: SaveOptions) {
  const usersThatFollow = await GraphModel.find({
    target: userIdWhoCreatedLevel,
    targetModel: 'User',
    type: GraphType.FOLLOW,
  }, 'source', {
    ...options,
  }).lean();

  const ids: Types.ObjectId[] = [];
  const createRecords = usersThatFollow.map(user => {
    const id = new Types.ObjectId();

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

export async function createNewRecordOnALevelYouSolvedNotifications(userIds: string[] | Types.ObjectId[], userIdWhoSetNewRecord: string | Types.ObjectId, targetLevelId: string | Types.ObjectId, message?: string, options?: SaveOptions) {
  const ids: Types.ObjectId[] = [];
  const createRecords = userIds.map(userId => {
    const id = new Types.ObjectId();

    ids.push(id);

    return {
      _id: id,
      message: message,
      source: userIdWhoSetNewRecord,
      sourceModel: 'User',
      target: targetLevelId,
      targetModel: 'Level',
      type: NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_SOLVED,
      userId: userId,
    };
  });

  const [nm, ] = await Promise.all([
    NotificationModel.create(createRecords, options),
    ...ids.map(id => queuePushNotification(id))
  ]);

  return nm;
}

export async function clearNotifications(userId?: string | Types.ObjectId, sourceId?: string | Types.ObjectId, targetId?: string | Types.ObjectId, type?: NotificationType, options?: QueryOptions) {
  const obj: {userId?: string | Types.ObjectId, target?: string | Types.ObjectId, source?: string | Types.ObjectId, type?: NotificationType} = {};

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
