import classNames from 'classnames';
import React, { useCallback } from 'react';
import toast from 'react-hot-toast';
import useUser from '../../hooks/useUser';
import Notification from '../../models/db/notification';
import FormattedNotification from './formattedNotification';
import styles from './NotificationList.module.css';

interface NotificationListProps {
  notifications: Notification[];
}

export default function NotificationList({ notifications }: NotificationListProps) {
  const { mutateUser } = useUser();
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
      mutateUser();
    } else {
      toast.dismiss();
      toast.error('Error marking notification as read');
    }
  }, [mutateUser]);

  const formattedNotifications = useCallback(() => {
    return _notifications.map(notification => {
      return (
        <FormattedNotification
          key={'notification-' + notification._id}
          notification={notification}
          onMarkAsRead={n => _onMarkAsRead([n], !n.read)}
        />
      );
    });
  }, [_notifications, _onMarkAsRead]);

  const anyUnread = notifications.some(notification => !notification.read);

  return (
    <div className='p-3'>
      <div className='flex flex-cols-2 justify-between'>
        <h2 className="focus:outline-none text-xl font-semibold">Notifications</h2>
        <button
          disabled={!anyUnread}
          className={classNames(
            'focus:outline-none text-sm',
            anyUnread ? styles['unread'] : undefined,
          )}
          onClick={() => {
            if (anyUnread) {
              _onMarkAsRead(notifications, true);
            }
          }}
          style={{
            color: !anyUnread ? 'var(--bg-color-4)' : undefined,
          }}
        >
          Mark all read
        </button>
      </div>
      {formattedNotifications().length > 0 ?
        formattedNotifications() :
        <p className='text-sm pt-2 justify-center flex'>No notifications!</p>
      }
    </div>
  );
}
