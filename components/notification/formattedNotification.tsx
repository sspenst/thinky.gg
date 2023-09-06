import { AchievementRulesCombined } from '@root/constants/achievements/achievementInfo';
import Collection from '@root/models/db/collection';
import classNames from 'classnames';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import Dimensions from '../../constants/dimensions';
import NotificationType from '../../constants/notificationType';
import getProfileSlug from '../../helpers/getProfileSlug';
import Achievement from '../../models/db/achievement';
import Comment from '../../models/db/comment';
import { EnrichedLevel } from '../../models/db/level';
import Notification from '../../models/db/notification';
import User from '../../models/db/user';
import FormattedCollectionLink from '../formatted/formattedCollectedLink';
import FormattedDate from '../formatted/formattedDate';
import FormattedLevelLink from '../formatted/formattedLevelLink';
import { Stars } from '../formatted/formattedReview';
import FormattedUser from '../formatted/formattedUser';

interface NotificationMessageProps {
  notification: Notification;
  onMarkAsRead: () => void;
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

  return hasText ?
    <>wrote a <Stars stars={Number(score)} /> review</> :
    <>gave a <Stars stars={Number(score)} /> rating</>;
}

function NotificationIcon({ notification }: { notification: Notification }) {
  let icon = null;

  switch (notification.type) {
  case NotificationType.NEW_ACHIEVEMENT: {
    const achievement = notification.source as Achievement;

    const meta = AchievementRulesCombined[achievement.type];

    icon = meta?.emoji;
  }

    break;
  }

  if (!icon) {
    return <Image alt='logo' src='/logo.svg' width='24' height='24' className='h-6 w-6' />;
  }

  return icon;
}

function NotificationMessage({ notification, onMarkAsRead }: NotificationMessageProps) {
  switch (notification.type) {
  case NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_BEAT:
    return (<>
      {'set a new record: '}
      <FormattedLevelLink level={notification.target as EnrichedLevel} onClick={onMarkAsRead} />
      {` - ${(notification.message)} moves`}
    </>);

  case NotificationType.NEW_REVIEW_ON_YOUR_LEVEL:
    return (
      <span className='flex flex-wrap items-center gap-1'>
        {getNewReviewOnYourLevelBody(notification.message)}
        {' on your level '}
        <FormattedLevelLink level={notification.target as EnrichedLevel} onClick={onMarkAsRead} />
      </span>
    );
  case NotificationType.NEW_FOLLOWER:
    return (<>
      {'started following you'}
    </>);
  case NotificationType.NEW_LEVEL:
    return (<>
      {'published a new level: '}
      <FormattedLevelLink level={notification.target as EnrichedLevel} onClick={onMarkAsRead} />
    </>);
  case NotificationType.NEW_LEVEL_ADDED_TO_COLLECTION:
    return (<>
      <FormattedLevelLink level={(notification.source) as EnrichedLevel} onClick={onMarkAsRead} />
      {' was added to the collection '}
      <FormattedCollectionLink collection={notification.target as Collection} onClick={onMarkAsRead} />
    </>);

  case NotificationType.NEW_ACHIEVEMENT:
    if (notification.source) {
      const achievement = notification.source as Achievement;

      const meta = AchievementRulesCombined[achievement.type];

      return (<>
        {`Achievement unlocked! ${meta?.description}`}
      </>);
    }

    return (<>
      {'Achievement not found'}
    </>);

  case NotificationType.NEW_WALL_POST: {
    const comment = notification.message ? JSON.parse(notification.message) as Comment : null;

    return (<>
      posted a <Link onClick={onMarkAsRead} className='underline' href={getProfileSlug(notification.target as User) + '?commentId=' + comment?._id}>message</Link> on your profile.
    </>);
  }

  case NotificationType.NEW_WALL_REPLY: {
    const comment = notification.message ? JSON.parse(notification.message) as Comment : null;

    const shortenedText = comment ? (comment.text.length > 10 ? comment.text.substring(0, 10) + '...' : comment.text) : '';

    return (<>
      replied &quot;{shortenedText}&quot; to your <Link onClick={onMarkAsRead} className='underline' href={getProfileSlug(notification.target as User) + '?commentId=' + comment?._id}>message</Link> on {notification.target.name}&apos;s profile.
    </>);
  }

  default:
    return null;
  }
}

interface FormattedNotificationProps {
  close?: () => void;
  notification: Notification;
  onMarkAsRead: (read: boolean) => void;
}

export default function FormattedNotification({ close, notification, onMarkAsRead }: FormattedNotificationProps) {
  return (
    <div
      className='p-3 border rounded shadow flex flex-cols-2 justify-between gap-2 items-center'
      style={{
        borderColor: 'var(--bg-color-4)',
        color: notification.read ? 'var(--color-gray)' : undefined,
      }}
    >
      <div className='flex flex-col gap-1 truncate'>
        {notification.sourceModel === 'User' ?
          <FormattedUser
            onClick={() => {
              onMarkAsRead(true);

              if (close) {
                close();
              }
            }}
            size={Dimensions.AvatarSizeSmall}
            user={notification.source as User}
          />
          :
          <div className='flex items-center gap-2 truncate'>
            <NotificationIcon notification={notification} />
            <span className='font-bold'>Pathology</span>
          </div>
        }
        <div className='flex items-center justify-between'>
          <div className='focus:outline-none text-sm whitespace-normal truncate flex items-center gap-1 flex-wrap'>
            <NotificationMessage
              notification={notification}
              onMarkAsRead={() => {
                onMarkAsRead(true);

                if (close) {
                  close();
                }
              }}
            />
          </div>
        </div>
        <FormattedDate className='text-xs' date={notification.createdAt} />
      </div>
      <div className='flex'>
        <button onClick={() => onMarkAsRead(!notification.read)} className={classNames(
          'w-4 h-4 border rounded-2xl',
          notification.read ? 'hover:bg-green-500 focus:bg-inherit' : 'bg-green-500 hover:bg-green-300'
        )} />
        <div aria-label='close icon' role='button' className='focus:outline-none cursor-pointer' />
      </div>
    </div>
  );
}
