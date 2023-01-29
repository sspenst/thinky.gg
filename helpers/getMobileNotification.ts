import { Types } from 'mongoose';
import AchievementInfo from '../constants/achievementInfo';
import NotificationType from '../constants/notificationType';
import { EnrichedLevel } from '../models/db/level';
import User, { ReqUser } from '../models/db/user';

export interface MobileNotification {
  badgeCount: number;
  body: string;
  imageUrl?: string;
  latestUnreadTs: number;
  notificationId?: Types.ObjectId;
  url: string;
}

export default function getMobileNotification(reqUser: ReqUser) {
  const unreadNotifications = reqUser.notifications;

  if (unreadNotifications.length === 0) {
    return null;
  }

  const mobileNotification = {
    badgeCount: unreadNotifications.length,
    body: `You have ${unreadNotifications.length} unread notifications`,
    latestUnreadTs: new Date(unreadNotifications[0].createdAt).getTime(),
    url: '',
  } as MobileNotification;

  if (unreadNotifications.length > 1) {
    return mobileNotification;
  }

  // if only one notification then write out more explicitly what the notif is
  const host = 'https://pathology.gg';
  const notification = unreadNotifications[0];
  const targetLevel = notification.target as EnrichedLevel;
  const targetUser = notification.target as User;

  mobileNotification.notificationId = notification._id;

  switch (notification.type) {
  case NotificationType.NEW_ACHIEVEMENT:
    if (notification.source) {
      mobileNotification.body = `Achievement unlocked! ${AchievementInfo[notification.source.type].description}`;
      mobileNotification.url = `${host}/profile/${reqUser.name}/achievements`;
    } else {
      mobileNotification.body = 'Unknown achievement';
      mobileNotification.url = `${host}/profile/${reqUser.name}/achievements`;
    }

    return mobileNotification;

  case NotificationType.NEW_FOLLOWER:
    mobileNotification.body = `${notification.source.name} started following you`;
    mobileNotification.imageUrl = `${host}/api/avatar/${notification.source._id}.png`;
    mobileNotification.url = `${host}/profile/${notification.source.name}`;

    return mobileNotification;

  case NotificationType.NEW_LEVEL:
    mobileNotification.body = `${notification.source.name} published a new level: ${targetLevel.name}`;
    mobileNotification.imageUrl = `${host}/api/level/image/${targetLevel._id}.png`;
    mobileNotification.url = `${host}/level/${targetLevel.slug}`;

    return mobileNotification;

  case NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_BEAT:
    mobileNotification.body = `${notification.source.name} set a new record: ${targetLevel.name} - ${notification.message} moves`;
    mobileNotification.imageUrl = `${host}/api/level/image/${targetLevel._id}.png`;
    mobileNotification.url = `${host}/level/${targetLevel.slug}`;

    return mobileNotification;

  case NotificationType.NEW_REVIEW_ON_YOUR_LEVEL:
    mobileNotification.body = `${notification.source.name} wrote a ${
      isNaN(Number(notification.message)) ? notification.message :
        Number(notification.message) > 0 ? `${Number(notification.message)} star` : undefined
    } review on your level ${targetLevel.name}`;
    mobileNotification.imageUrl = `${host}/api/level/image/${targetLevel._id}.png`;
    mobileNotification.url = `${host}/level/${targetLevel.slug}`;

    return mobileNotification;

  case NotificationType.NEW_WALL_POST: {
    const comment = notification.message
      ? JSON.parse(notification.message)
      : null;
    const shortenedText = comment
      ? comment.text.length > 10
        ? comment.text.substring(0, 10) + '...'
        : comment.text
      : '';

    mobileNotification.body = `${notification.source.name} posted "${shortenedText}" on your profile.`;
    mobileNotification.imageUrl = `${host}/api/avatar/${notification.source._id}.png`;
    mobileNotification.url = `${host}/profile/${reqUser.name}`;

    return mobileNotification;
  }

  case NotificationType.NEW_WALL_REPLY: {
    const comment = notification.message
      ? JSON.parse(notification.message)
      : null;
    const shortenedText = comment
      ? comment.text.length > 10
        ? comment.text.substring(0, 10) + '...'
        : comment.text
      : '';

    mobileNotification.body = `${notification.source.name} replied "${shortenedText}" to your message on ${targetUser.name}'s profile.`;
    mobileNotification.imageUrl = `${host}/api/avatar/${notification.source._id}.png`;
    mobileNotification.url = `${host}/profile/${targetUser.name}`;

    return mobileNotification;
  }

  default:
    mobileNotification.body = 'You have 1 unread notification';
    mobileNotification.url = `${host}/notifications`;

    return mobileNotification;
  }
}
