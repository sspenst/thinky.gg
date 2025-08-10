import { AchievementRulesCombined } from '@root/constants/achievements/achievementInfo';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import Achievement from '@root/models/db/achievement';
import Collection from '@root/models/db/collection';
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
export default function getMobileNotification(gameId: GameId, notification: Notification) {
  const game = Games[gameId];
  const host = game.baseUrl;
  const mobileNotification = {
    badgeCount: 1,
    title: game.displayName + ' - New Notification',
    body: 'You have an unread notification',
    url: `${host}/notifications`,
  } as MobileNotification;
  const targetAsLevel = notification.target as EnrichedLevel;
  const targetAsCollection = notification.target as Collection;
  const targetAsUser = notification.target as User;
  const user: User = notification.userId;

  mobileNotification.notificationId = notification._id.toString();

  switch (notification.type) {
  case NotificationType.ADMIN_MESSAGE: {
    if (notification.message) {
      const payload = JSON.parse(notification.message);

      mobileNotification.title = game.displayName;
      mobileNotification.body = `${payload.message}`;
      mobileNotification.url = `${host}${payload.href}`;
    }

    return mobileNotification;
  }

  case NotificationType.NEW_ACHIEVEMENT: {
    const source = notification.source as Achievement;

    mobileNotification.title = game.displayName + ' - New Achievement';
    const meta = AchievementRulesCombined[source.type];

    if (notification.source) {
      mobileNotification.body = `${meta?.emoji} Achievement unlocked! ${meta.getDescription(game)}`;
      mobileNotification.url = `${host}/profile/${user.name}/achievements`;
    } else {
      mobileNotification.body = 'Unknown achievement';
      mobileNotification.url = `${host}/profile/${user.name}/achievements`;
    }

    return mobileNotification;
  }

  case NotificationType.NEW_FOLLOWER: {
    const source = notification.source as User;

    mobileNotification.title = game.displayName + ' - New Follower';
    mobileNotification.body = `${source.name} started following you`;
    mobileNotification.imageUrl = `${host}/api/avatar/${source._id}.png`;
    mobileNotification.url = `${host}/profile/${source.name}`;

    return mobileNotification;
  }

  case NotificationType.NEW_LEVEL: {
    const source = notification.source as User;

    mobileNotification.title = game.displayName + ' - New Level';
    mobileNotification.body = `${source.name} published a new level: ${targetAsLevel.name}`;
    mobileNotification.imageUrl = `${host}/api/level/image/${targetAsLevel._id}.png`;
    mobileNotification.url = `${host}/level/${targetAsLevel.slug}`;

    return mobileNotification;
  }

  case NotificationType.NEW_LEVEL_ADDED_TO_COLLECTION: {
    const source = notification.source as User;

    mobileNotification.title = game.displayName + ' - Your level added to a collection';
    mobileNotification.body = `${source?.name} was added to the collection: ${targetAsCollection.name}`;
    mobileNotification.imageUrl = `${host}/${game.logo}}`;
    mobileNotification.url = `${host}/collection/${targetAsCollection.slug}`;

    return mobileNotification;
  }

  case NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_SOLVED:{
    const source = notification.source as User;

    mobileNotification.title = game.displayName + ' - New Record';
    mobileNotification.body = `${source.name} set a new record: ${targetAsLevel.name} - ${notification.message} moves`;
    mobileNotification.imageUrl = `${host}/api/level/image/${targetAsLevel._id}.png`;
    mobileNotification.url = `${host}/level/${targetAsLevel.slug}`;

    return mobileNotification;
  }

  case NotificationType.NEW_REVIEW_ON_YOUR_LEVEL:{
    const source = notification.source as User;

    mobileNotification.title = game.displayName + ' - New Review';
    mobileNotification.body = `${source.name} ${getNewReviewOnYourLevelBody(notification.message)} on your level ${targetAsLevel.name}`;
    mobileNotification.imageUrl = `${host}/api/level/image/${targetAsLevel._id}.png`;
    mobileNotification.url = `${host}/level/${targetAsLevel.slug}`;

    return mobileNotification;
  }

  case NotificationType.NEW_WALL_POST: {
    const source = notification.source as User;

    mobileNotification.title = game.displayName + ' - New Comment';
    const comment = notification.message
      ? JSON.parse(notification.message)
      : null;
    const shortenedText = comment
      ? comment.text.length > 10
        ? comment.text.substring(0, 10) + '...'
        : comment.text
      : '';

    mobileNotification.body = `${source.name} posted "${shortenedText}" on your profile.`;
    mobileNotification.imageUrl = `${host}/api/avatar/${source._id}.png`;
    mobileNotification.url = `${host}/profile/${user.name}`;

    return mobileNotification;
  }

  case NotificationType.NEW_WALL_REPLY: {
    const source = notification.source as User;

    mobileNotification.title = game.displayName + ' - New Reply';
    const comment = notification.message
      ? JSON.parse(notification.message)
      : null;
    const shortenedText = comment
      ? comment.text.length > 10
        ? comment.text.substring(0, 10) + '...'
        : comment.text
      : '';

    mobileNotification.body = `${source.name} replied "${shortenedText}" to your message on ${targetAsUser.name}'s profile.`;
    mobileNotification.imageUrl = `${host}/api/avatar/${source._id}.png`;
    mobileNotification.url = `${host}/profile/${targetAsUser.name}`;

    return mobileNotification;
  }

  case NotificationType.LEVEL_OF_DAY: {
    mobileNotification.title = game.displayName + ' - Level of the Day';

    if (notification.source && (notification.source as EnrichedLevel)._id) {
      const levelOfDay = notification.source as EnrichedLevel;

      mobileNotification.body = notification.message || `Check out today's ${game.displayName} level of the day!`;
      mobileNotification.imageUrl = `${host}/api/level/image/${levelOfDay._id}.png`;
      mobileNotification.url = `${host}/level-of-day`;
    } else {
      mobileNotification.body = notification.message || `Check out today's ${game.displayName} level of the day!`;
      mobileNotification.url = `${host}/level-of-day`;
    }

    return mobileNotification;
  }

  default:
    return mobileNotification;
  }
}
