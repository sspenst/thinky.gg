import { ObjectId } from 'bson';
import { NotificationType } from '../components/notification/notificationList';
import { NotificationModel } from '../models/mongoose';

export async function createNewReviewOnYourLevelNotification(userId: string | ObjectId, forLevelBelongingToUserId: string | ObjectId, targetLevelId: string | ObjectId, message: string | ObjectId) {
  await NotificationModel.updateOne({
    userId: userId,
    source: forLevelBelongingToUserId,
    sourceModel: 'User',
    target: targetLevelId,
  }, {
    userId: userId,
    source: forLevelBelongingToUserId,
    sourceModel: 'User',
    target: targetLevelId,
    targetModel: 'Level',
    message: message,
    type: NotificationType.NEW_REVIEW_ON_YOUR_LEVEL,
  }, {
    upsert: true,
  });
}

export async function createNewRecordOnALevelYouBeatNotification(userIds: string[] | ObjectId[], userIdWhoSetNewRecord: string | ObjectId, targetLevelId: string | ObjectId, message?: string | ObjectId) {
  const createRecords = userIds.map((userId) => {
    return { userId: userId,
      source: userIdWhoSetNewRecord,
      sourceModel: 'User',
      target: targetLevelId,
      targetModel: 'Level',
      message: message,
      type: NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_BEAT
    };
  });

  await NotificationModel.create(createRecords);
}

export async function clearNotifications(userId: string | ObjectId, sourceId?: string | ObjectId, targetId?: string | ObjectId, type?: NotificationType ) {
  const obj: {userId: string | ObjectId, target?: string | ObjectId, source?: string | ObjectId, type?: NotificationType} = {
    userId: userId,
  };

  if (targetId) {
    obj['target'] = targetId;
  }

  if (sourceId) {
    obj['source'] = sourceId;
  }

  if (type) {
    obj['type'] = type;
  }

  await NotificationModel.deleteMany({
    ...obj,
  });
}
