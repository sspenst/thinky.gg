import classNames from 'classnames';
import React, { useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import useUser from '../../hooks/useUser';
import Notification from '../../models/db/notification';
import FormattedNotification from './formattedNotification';
import styles from './NotificationList.module.css';

interface NotificationListProps {
  notifications: Notification[];
}

export default function NotificationList({ notifications }: NotificationListProps) {
  const [_notifications, setNotifications] = React.useState<Notification[]>(notifications);

  const _onMarkAsRead = useCallback(async (notifications: Notification[], read: boolean) => {
    const res = await fetch('/api/notification', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids: notifications.map(notification => notification._id),
        read: read
      }),
    });

    if (res.status === 200) {
      const data = await res.json();

      setNotifications(data);
    } else {
      toast.dismiss();
      toast.error('Error marking notification as read');
    }
  }, [mutateUser]);

  type ftype = ({ notification }: {notification: Notification}) => JSX.Element;

  const formattedNotifications = useCallback(() => {
    return _notifications.map(notification => {
      const notificationIndicatorUnread = ' p-1 w-5 h-4 bg-green-500 border rounded-full align-bottom self-center hover:bg-green-200';
      const notificationIndicatorRead = ' p-1 w-5 h-4 border rounded-full align-bottom self-center hover:bg-green-500';
      const typeMap: Record<NotificationType, ftype> = {
        [NotificationType.BASIC]: BasicNotification,
        [NotificationType.FOLLOWED_USER_PUBLISHED_LEVEL]: FollowedUserPublishedLevelNotification,
        [NotificationType.NEW_REVIEW_ON_YOUR_LEVEL]: NewReviewOnYourLevelNotification,
        [NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_BEAT]: NewRecordOnALevelYouBeatNotification,
      };
      const NotificationComponent = typeMap[notification.type as NotificationType] ?? BasicNotification;

      return (
        <FormattedNotification
          notification={notification}
        />
      );
    });
  }, [_notifications, _onMarkAsRead]);

  const anyUnread = notifications.some(notification => !notification.read);

  return (
    <div className='p-3'>
      <div className='flex flex-cols-2 justify-between'>
        <h2 className="focus:outline-none text-xl font-semibold">Notifications</h2>
        <button disabled={!anyUnread}
          className='focus:outline-none text-sm hover:font-semibold' onClick={() => {
            _onMarkAsRead(notifications, true);
          }}>
          Mark all read</button>
      </div>
      {formattedNotifications().length > 0 ?
        formattedNotifications() :
        <p className='text-sm pt-2 justify-center flex'>No notifications!</p>
      }
    </div>
  );
}
