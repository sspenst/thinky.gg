import Collection from '@root/models/db/collection';
import classNames from 'classnames';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import AchievementInfo from '../../constants/achievementInfo';
import Dimensions from '../../constants/dimensions';
import NotificationType from '../../constants/notificationType';
import getProfileSlug from '../../helpers/getProfileSlug';
import Achievement from '../../models/db/achievement';
import Comment from '../../models/db/comment';
import { EnrichedLevel } from '../../models/db/level';
import Notification from '../../models/db/notification';
import User from '../../models/db/user';
import CollectionLink from '../collectionLink';
import EnrichedLevelLink from '../enrichedLevelLink';
import FormattedDate from '../formattedDate';
import { Stars } from '../formattedReview';
import FormattedUser from '../formattedUser';

interface NotificationMessageProps {
  notification: Notification;
  onMarkAsRead: () => void;
}

function NotificationMessage({ notification, onMarkAsRead }: NotificationMessageProps) {
  switch (notification.type) {
  case NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_BEAT:
    return (<>
      {'set a new record: '}
      <EnrichedLevelLink level={notification.target as EnrichedLevel} onClick={onMarkAsRead} />
      {` - ${(notification.message)} moves`}
    </>);

  case NotificationType.NEW_REVIEW_ON_YOUR_LEVEL:
    return (
      <span className='flex flex-wrap items-center gap-1'>
        {'wrote a '}
        {isNaN(Number(notification.message)) ? notification.message : Number(notification.message) > 0 ? <Stars stars={Number(notification.message)} /> : null}
        {' review on your level '}
        <EnrichedLevelLink level={notification.target as EnrichedLevel} onClick={onMarkAsRead} />
      </span>
    );
  case NotificationType.NEW_FOLLOWER:
    return (<>
      {'started following you'}
    </>);
  case NotificationType.NEW_LEVEL:
    return (<>
      {'published a new level: '}
      <EnrichedLevelLink level={notification.target as EnrichedLevel} onClick={onMarkAsRead} />
    </>);
  case NotificationType.NEW_LEVEL_ADDED_TO_COLLECTION:
    return (<>
      <EnrichedLevelLink level={(notification.source) as EnrichedLevel} onClick={onMarkAsRead} />
      {' was added to the collection '}
      <CollectionLink collection={notification.target as Collection} onClick={onMarkAsRead} />
    </>);

  case NotificationType.NEW_ACHIEVEMENT:
    if (notification.source) {
      const achievement = notification.source as Achievement;

      return (<>
        {`Achievement unlocked! ${AchievementInfo[achievement.type].description}`}
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
  notification: Notification;
  onMarkAsRead: (read: boolean) => void;
}

export default function FormattedNotification({ notification, onMarkAsRead }: FormattedNotificationProps) {
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
            onClick={() => onMarkAsRead(true)}
            size={Dimensions.AvatarSizeSmall}
            user={notification.source as User}
          />
          :
          <div className='flex items-center gap-2 truncate'>
            <Image alt='logo' src='/logo.svg' width='24' height='24' className='h-6 w-6' />
            <span className='font-bold'>Pathology</span>
          </div>
        }
        <div className='flex items-center justify-between'>
          <div className='focus:outline-none text-sm whitespace-normal'>
            <NotificationMessage notification={notification} onMarkAsRead={() => onMarkAsRead(true)} />
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
