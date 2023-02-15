import AchievementInfo from '../constants/achievementInfo';
import NotificationType from '../constants/notificationType';
import { EnrichedLevel } from '../models/db/level';
import Notification from '../models/db/notification';
import User, { ReqUser } from '../models/db/user';

interface MobileNotification {
  title: string,
  badgeCount?: number;
  body: string;
  imageUrl?: string;
  latestUnreadTs?: number;
  notificationId?: string;
  url: string;
}

/** Note notification requries userId to be populated with name */
export function parseNotificationProperties(notification: Notification) {
  const mobileNotification = {
    title: 'New Notifications',
    body: 'You have an unread notifications',
    url: '',
  } as MobileNotification;
  const host = 'https://pathology.gg';
  const targetLevel = notification.target as EnrichedLevel;
  const targetUser = notification.target as User;
  const user: User = notification.userId;

  mobileNotification.notificationId = notification._id.toString();

  switch (notification.type) {
  case NotificationType.NEW_ACHIEVEMENT:
    mobileNotification.title = 'New Achievement!';

    if (notification.source) {
      mobileNotification.body = `Achievement unlocked! ${AchievementInfo[notification.source.type].description}`;
      mobileNotification.url = `${host}/profile/${user.name}/achievements`;
    } else {
      mobileNotification.body = 'Unknown achievement';
      mobileNotification.url = `${host}/profile/${user.name}/achievements`;
    }

    return mobileNotification;

  case NotificationType.NEW_FOLLOWER:
    mobileNotification.title = 'New Follower';
    mobileNotification.body = `${notification.source.name} started following you`;
    mobileNotification.imageUrl = `${host}/api/avatar/${notification.source._id}.png`;
    mobileNotification.url = `${host}/profile/${notification.source.name}`;

    return mobileNotification;

  case NotificationType.NEW_LEVEL:
    mobileNotification.title = 'New Level';
    mobileNotification.body = `${notification.source.name} published a new level: ${targetLevel.name}`;
    mobileNotification.imageUrl = `${host}/api/level/image/${targetLevel._id}.png`;
    mobileNotification.url = `${host}/level/${targetLevel.slug}`;

    return mobileNotification;

  case NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_BEAT:
    mobileNotification.title = 'New Record';
    mobileNotification.body = `${notification.source.name} set a new record: ${targetLevel.name} - ${notification.message} moves`;
    mobileNotification.imageUrl = `${host}/api/level/image/${targetLevel._id}.png`;
    mobileNotification.url = `${host}/level/${targetLevel.slug}`;

    return mobileNotification;

  case NotificationType.NEW_REVIEW_ON_YOUR_LEVEL:
    mobileNotification.title = 'New Review';
    mobileNotification.body = `${notification.source.name} wrote a ${
      isNaN(Number(notification.message)) ? notification.message :
        Number(notification.message) > 0 ? `${Number(notification.message)} star` : undefined
    } review on your level ${targetLevel.name}`;
    mobileNotification.imageUrl = `${host}/api/level/image/${targetLevel._id}.png`;
    mobileNotification.url = `${host}/level/${targetLevel.slug}`;

    return mobileNotification;

  case NotificationType.NEW_WALL_POST: {
    mobileNotification.title = 'New Comment';
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
    mobileNotification.url = `${host}/profile/${user.name}`;

    return mobileNotification;
  }

  case NotificationType.NEW_WALL_REPLY: {
    mobileNotification.title = 'New Reply';
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
    mobileNotification.title = 'New Notification';
    mobileNotification.body = 'You have 1 unread notification';
    mobileNotification.url = `${host}/notifications`;

    return mobileNotification;
  }
}

export default function getMobileNotification(reqUser: ReqUser) {
  const unreadNotifications = reqUser.notifications;

  if (unreadNotifications.length === 0) {
    return null;
  }

  const mobileNotification = {
    title: 'New Notifications',
    badgeCount: unreadNotifications.length,
    body: `You have ${unreadNotifications.length} unread notifications`,
    latestUnreadTs: new Date(unreadNotifications[0].createdAt).getTime(),
    url: '',
  } as MobileNotification;

  if (unreadNotifications.length > 1) {
    return mobileNotification;
  }

  const resp = parseNotificationProperties(unreadNotifications[0]);

  resp.badgeCount = 1;

  return resp;
}
