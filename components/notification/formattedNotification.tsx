import classNames from 'classnames';
import React from 'react';
import Dimensions from '../../constants/dimensions';
import NotificationType from '../../constants/notificationType';
import getFormattedDate from '../../helpers/getFormattedDate';
import { EnrichedLevel } from '../../models/db/level';
import Notification from '../../models/db/notification';
import User from '../../models/db/user';
import EnrichedLevelLink from '../enrichedLevelLink';
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
        {isNaN(Number(notification.message)) ? notification.message : Number(notification.message) > 0 ? <Stars stars={Number(notification.message)} /> : undefined}
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
      className={classNames(
        'mt-2 p-3 border rounded shadow flex flex-cols-3 items-center',
        { 'opacity-70': notification.read },
      )}
      style={{
        borderColor: 'var(--bg-color-4)',
      }}
    >
      {notification.source as User &&
        <div className='flex'>
          <FormattedUser
            onClick={() => onMarkAsRead(true)}
            size={Dimensions.AvatarSizeSmall}
            user={notification.source as User}
          />
        </div>
      }
      <div className='pl-3 w-full'>
        <div className='flex items-center justify-between w-full'>
          <div className='focus:outline-none text-sm leading-none'>
            <NotificationMessage notification={notification} onMarkAsRead={() => onMarkAsRead(true)} />
          </div>
          <div aria-label='close icon' role='button' className='focus:outline-none cursor-pointer' />
        </div>
        <div
          className='focus:outline-none text-xs leading-3 pt-1'
          style={{
            color: 'var(--bg-color-4)',
          }}
        >
          {getFormattedDate(new Date(notification.createdAt).getTime() / 1000)}
        </div>
      </div>
      <div className='flex'>
        <button onClick={() => onMarkAsRead(!notification.read)} className={classNames(
          'w-4 h-4 border rounded-2xl',
          notification.read ? 'hover:bg-green-500 focus:bg-inherit' : 'bg-green-500 hover:bg-green-300'
        )} />
      </div>
    </div>
  );
}
