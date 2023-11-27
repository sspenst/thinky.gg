import { GameId } from '@root/constants/GameId';
import { requestBroadcastNotifications } from '@root/lib/appSocketToClient';
import Level from '@root/models/db/level';
import Notification from '@root/models/db/notification';
import User from '@root/models/db/user';
import { ClientSession, QueryOptions, SaveOptions, Types } from 'mongoose';
import AchievementType from '../constants/achievements/achievementType';
import GraphType from '../constants/graphType';
import NotificationType from '../constants/notificationType';
import Achievement from '../models/db/achievement';
import { AchievementModel, GraphModel, NotificationModel } from '../models/mongoose';
import { bulkQueuePushNotification, queuePushNotification } from '../pages/api/internal-jobs/worker';

export async function createNewAdminMessageNotifications(gameId: GameId, userIds: Types.ObjectId[], payload: string, session: ClientSession) {
  const notificationIds = [];
  const notifications = [];

  for (const userId of userIds) {
    const notificationId = new Types.ObjectId();

    notificationIds.push(notificationId);
    notifications.push({
      _id: notificationId,
      gameId: gameId,
      message: payload,
      type: NotificationType.ADMIN_MESSAGE,
      userId: userId,
      read: false,
    });
  }

  await NotificationModel.insertMany(notifications, { session: session });
  await bulkQueuePushNotification(notificationIds, session);
  await Promise.all(userIds.map(userId => requestBroadcastNotifications(userId)));

  return notifications;
}

export async function createNewWallPostNotification(gameId: GameId, type: NotificationType.NEW_WALL_POST |NotificationType.NEW_WALL_REPLY, userId: string | Types.ObjectId, sourceUserId: string | Types.ObjectId, targetUserId: string | Types.ObjectId, message: string) {
  const id = new Types.ObjectId();

  const [notification] = await Promise.all([
    NotificationModel.create([{
      _id: id,
      createdAt: new Date(),
      gameId: gameId,
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

  await requestBroadcastNotifications(new Types.ObjectId(userId)); // needs to happen after creating the notif

  return notification;
}

export async function createNewProUserNotification(gameId: GameId, userId: string | Types.ObjectId, fromUser?: string | Types.ObjectId, message?: string) {
  const notification = await NotificationModel.findOneAndUpdate({
    source: fromUser || userId,
    sourceModel: 'User',
    target: userId,
    targetModel: 'User',
    type: NotificationType.UPGRADED_TO_PRO,
    // TODO: probably should check for createdAt < 1 day here...
  }, {
    gameId: gameId,
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

  await Promise.all([
    queuePushNotification(notification._id),
    requestBroadcastNotifications(new Types.ObjectId(userId)),
  ]);

  return notification;
}

export async function createNewFollowerNotification(gameId: GameId, follower: string | Types.ObjectId, following: string | Types.ObjectId) {
  const notification = await NotificationModel.findOneAndUpdate({
    source: follower,
    sourceModel: 'User',
    target: following,
    type: NotificationType.NEW_FOLLOWER,
    userId: following,
    // TODO: probably should check for createdAt < 1 day here...
  }, {
    message: '',
    gameId: gameId,
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

  await Promise.all([
    queuePushNotification(notification._id),
    requestBroadcastNotifications(new Types.ObjectId(following)),
  ]);
}

export async function createNewReviewOnYourLevelNotification(gameId: GameId, levelUserId: Types.ObjectId, sourceUserId: string | Types.ObjectId, targetLevelId: string | Types.ObjectId, score: string, hasText?: boolean) {
  // should not create a notification if the user is reviewing their own level
  if (sourceUserId.toString() === levelUserId.toString()) {
    return null;
  }

  const message = `${String(score)},${String(!!hasText)}`;

  const notification = await NotificationModel.findOneAndUpdate<Notification>({
    source: sourceUserId,
    sourceModel: 'User',
    target: targetLevelId,
    type: NotificationType.NEW_REVIEW_ON_YOUR_LEVEL,
    userId: levelUserId,
  }, {
    message: message,
    gameId: gameId,
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

  await Promise.all([
    queuePushNotification(notification._id),
    requestBroadcastNotifications(levelUserId as Types.ObjectId),
  ]);

  return notification;
}

export async function createNewAchievement(gameId: GameId, achievementType: AchievementType, userId: Types.ObjectId, disablePushNotification?: boolean, options?: SaveOptions) {
  const achievement = await AchievementModel.findOneAndUpdate<Achievement>({
    type: achievementType,
    userId: userId,
    gameId: gameId,
  }, {
    type: achievementType,
    userId: userId,
    gameId: gameId,
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
    gameId: gameId,
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
    await Promise.all([
      queuePushNotification(notification._id),
      requestBroadcastNotifications(userId),
    ]);
  }

  return achievement;
}

export async function createNewLevelAddedToCollectionNotification(gameId: GameId, actor: User, level: Level, targetCollectionIds: string[] | Types.ObjectId[]) {
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
      gameId: gameId,
      type: NotificationType.NEW_LEVEL_ADDED_TO_COLLECTION,
      userId: level.userId,
    };
  });

  const [nm,] = await Promise.all([
    await NotificationModel.create(createRecords),
    ...ids.map(id => queuePushNotification(id)),

  ]);

  await requestBroadcastNotifications(new Types.ObjectId(level.userId)); // needs to happen after creating the notif

  return nm;
}

export async function createNewLevelNotifications(gameId: GameId, userIdWhoCreatedLevel: Types.ObjectId, targetLevelId: Types.ObjectId, message?: string, options?: SaveOptions) {
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
      gameId: gameId,
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
    ...ids.map(id => queuePushNotification(id)),
  ]);

  await Promise.all(usersThatFollow.map(user => requestBroadcastNotifications(user.source._id))); // needs to happen after creating the notif

  return nm;
}

export async function createNewRecordOnALevelYouSolvedNotifications(gameId: GameId, userIds: string[] | Types.ObjectId[], userIdWhoSetNewRecord: string | Types.ObjectId, targetLevelId: string | Types.ObjectId, message?: string, options?: SaveOptions) {
  const ids: Types.ObjectId[] = [];
  const createRecords = userIds.map(userId => {
    const id = new Types.ObjectId();

    ids.push(id);

    return {
      _id: id,
      gameId: gameId,
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
    ...ids.map(id => queuePushNotification(id)),

  ]);

  await Promise.all(userIds.map(userId => requestBroadcastNotifications(new Types.ObjectId(userId)))); // needs to happen after creating the notif

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
