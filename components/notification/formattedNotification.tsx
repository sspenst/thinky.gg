import React from 'react';
import Dimensions from '../../constants/dimensions';
import NotificationType from '../../constants/notificationType';
import getFormattedDate from '../../helpers/getFormattedDate';
import Notification from '../../models/db/notification';
import User from '../../models/db/user';
import { EnrichedLevel } from '../../pages/search';
import EnrichedLevelLink from '../enrichedLevelLink';
import FormattedUser from '../formattedUser';

interface NotificationMessageProps {
  notification: Notification;
}

function NotificationMessage({ notification }: NotificationMessageProps) {
  switch (notification.type) {
  case NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_BEAT:
    return (<>
      {'set a new record: '}
      <EnrichedLevelLink level={notification.target as EnrichedLevel} />
      {` - ${(notification.target as EnrichedLevel).leastMoves} moves`}
    </>);
  case NotificationType.NEW_REVIEW_ON_YOUR_LEVEL:
    return (<>
      {`wrote a ${notification.message} review on your level `}
      <EnrichedLevelLink level={notification.target as EnrichedLevel} />
    </>);
  default:
    return null;
  }
}

interface FormattedNotificationProps {
  notification: Notification;
  onMarkAsRead: (notification: Notification) => void;
}

export default function FormattedNotification({ notification, onMarkAsRead }: FormattedNotificationProps) {
  const notificationIndicatorUnread = 'p-1 w-5 h-4 bg-green-500 border rounded-full align-bottom self-center hover:bg-green-200';
  const notificationIndicatorRead = 'p-1 w-5 h-4 border rounded-full align-bottom self-center hover:bg-green-500';

  return (
    <div className='mt-2 p-3 border rounded shadow flex flex-cols-3' style={{
      borderColor: 'var(--bg-color-4)',
    }}>
      {notification.source as User &&
        <div className='flex content-center'>
          <FormattedUser size={Dimensions.AvatarSizeSmall} user={notification.source as User} />
        </div>
      }
      <div className='pl-3 w-full'>
        <div className='flex items-center justify-between w-full'>
          <p className='focus:outline-none text-sm leading-none'>
            <NotificationMessage notification={notification} />
          </p>
          <div aria-label='close icon' role='button' className='focus:outline-none cursor-pointer' />
        </div>
        <p
          className='focus:outline-none text-xs leading-3 pt-1'
          style={{
            color: 'var(--bg-color-4)',
          }}
        >
          {getFormattedDate(new Date(notification.createdAt).getTime() / 1000)}
        </p>
      </div>
      <button onClick={() => onMarkAsRead(notification)} className={notification.read ? notificationIndicatorRead : notificationIndicatorUnread}></button>
    </div>
  );
}
