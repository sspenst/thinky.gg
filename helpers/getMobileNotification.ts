import Collection from '@root/models/db/collection';
import AchievementRulesTable from '../constants/achievementInfo';
import NotificationType from '../constants/notificationType';
import { EnrichedLevel } from '../models/db/level';
import Notification from '../models/db/notification';
import User from '../models/db/user';

interface MobileNotification {
  badgeCount?: number;
  body: string;
  imageUrl?: string;
  latestUnreadTs?: number;
  notificationId?: string;
  title: string;
  url: string;
}

function getNewReviewOnYourLevelBody(message?: string) {
  if (!message) {
    return 'wrote a review';
  }

  // message format should either be "score" or "score,hasText"
  const arr = message.split(',');

  if (isNaN(Number(arr[0]))) {
    return message;
  }

  const score = Number(arr[0]);

  if (score <= 0) {
    return 'wrote a review';
  }

  const hasText = arr[1] === 'true';

  return hasText ? `wrote a ${score} star review` : `gave a ${score} star rating`;
}

/* notification must be populated using getEnrichNotificationPipelineStages */
export default function getMobileNotification(notification: Notification) {
  const host = 'https://pathology.gg';
  const mobileNotification = {
    badgeCount: 1,
    title: 'Pathology - New Notification',
    body: 'You have an unread notification',
    url: `${host}/notifications`,
  } as MobileNotification;
  const targetAsLevel = notification.target as EnrichedLevel;
  const targetAsCollection = notification.target as Collection;
  const targetAsUser = notification.target as User;
  const user: User = notification.userId;

  mobileNotification.notificationId = notification._id.toString();

  switch (notification.type) {
  case NotificationType.NEW_ACHIEVEMENT:
    mobileNotification.title = 'Pathology - New Achievement!';

    if (notification.source) {
      mobileNotification.body = `Achievement unlocked! ${AchievementRulesTable[notification.source.type].description}`;
      mobileNotification.url = `${host}/profile/${user.name}/achievements`;
    } else {
      mobileNotification.body = 'Unknown achievement';
      mobileNotification.url = `${host}/profile/${user.name}/achievements`;
    }

    return mobileNotification;

  case NotificationType.NEW_FOLLOWER:
    mobileNotification.title = 'Pathology - New Follower';
    mobileNotification.body = `${notification.source.name} started following you`;
    mobileNotification.imageUrl = `${host}/api/avatar/${notification.source._id}.png`;
    mobileNotification.url = `${host}/profile/${notification.source.name}`;

    return mobileNotification;

  case NotificationType.NEW_LEVEL:
    mobileNotification.title = 'Pathology - New Level';
    mobileNotification.body = `${notification.source.name} published a new level: ${targetAsLevel.name}`;
    mobileNotification.imageUrl = `${host}/api/level/image/${targetAsLevel._id}.png`;
    mobileNotification.url = `${host}/level/${targetAsLevel.slug}`;

    return mobileNotification;

  case NotificationType.NEW_LEVEL_ADDED_TO_COLLECTION:
    mobileNotification.title = 'Pathology - Your level added to a collection';
    mobileNotification.body = `${notification.source?.name} was added to the collection: ${targetAsCollection.name}`;
    mobileNotification.imageUrl = `${host}/logo.svg`;
    mobileNotification.url = `${host}/collection/${targetAsCollection.slug}`;

    return mobileNotification;

  case NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_BEAT:
    mobileNotification.title = 'Pathology - New Record';
    mobileNotification.body = `${notification.source.name} set a new record: ${targetAsLevel.name} - ${notification.message} moves`;
    mobileNotification.imageUrl = `${host}/api/level/image/${targetAsLevel._id}.png`;
    mobileNotification.url = `${host}/level/${targetAsLevel.slug}`;

    return mobileNotification;

  case NotificationType.NEW_REVIEW_ON_YOUR_LEVEL:
    mobileNotification.title = 'Pathology - New Review';
    mobileNotification.body = `${notification.source.name} ${getNewReviewOnYourLevelBody(notification.message)} on your level ${targetAsLevel.name}`;
    mobileNotification.imageUrl = `${host}/api/level/image/${targetAsLevel._id}.png`;
    mobileNotification.url = `${host}/level/${targetAsLevel.slug}`;

    return mobileNotification;

  case NotificationType.NEW_WALL_POST: {
    mobileNotification.title = 'Pathology - New Comment';
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
    mobileNotification.title = 'Pathology - New Reply';
    const comment = notification.message
      ? JSON.parse(notification.message)
      : null;
    const shortenedText = comment
      ? comment.text.length > 10
        ? comment.text.substring(0, 10) + '...'
        : comment.text
      : '';

    mobileNotification.body = `${notification.source.name} replied "${shortenedText}" to your message on ${targetAsUser.name}'s profile.`;
    mobileNotification.imageUrl = `${host}/api/avatar/${notification.source._id}.png`;
    mobileNotification.url = `${host}/profile/${targetAsUser.name}`;

    return mobileNotification;
  }

  default:
    return mobileNotification;
  }
}
