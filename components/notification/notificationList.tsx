import classNames from 'classnames';
import React, { useCallback } from 'react';
import toast from 'react-hot-toast';
import Notification from '../../models/db/notification';
import FormattedNotification from './formattedNotification';
import styles from './NotificationList.module.css';

interface NotificationListProps {
  mutateNotifications?: () => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export default function NotificationList({ mutateNotifications, notifications, setNotifications }: NotificationListProps) {
  const putNotification = useCallback((notifications: Notification[], read: boolean) => {
    fetch('/api/notification', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids: notifications.map(notification => notification._id),
        read: read
      }),
    }).then(async res => {
      if (res.status === 200) {
        // upon successful update, mutate the source of the notifications so that
        // their read status stays up to date across pages
        if (mutateNotifications) {
          mutateNotifications();
        }
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error marking notification as read');
    });
  }, [mutateNotifications]);

  const onMarkAsRead = useCallback(async (notifications: Notification[], read: boolean) => {
    putNotification(notifications, read);

    const notificationIds = notifications.map(n => n._id);

    setNotifications(prevNotifications => {
      const newNotifications = [];

      for (let i = 0; i < prevNotifications.length; i++) {
        const newNotification = JSON.parse(JSON.stringify(prevNotifications[i])) as Notification;

        if (notificationIds.includes(newNotification._id)) {
          newNotification.read = read;
        }

        newNotifications.push(newNotification);
      }

      return newNotifications;
    });
  }, [putNotification, setNotifications]);

  const formattedNotifications = useCallback(() => {
    return notifications.map(notification => {
      return (
        <FormattedNotification
          key={'notification-' + notification._id}
          notification={notification}
          onMarkAsRead={(read: boolean) => onMarkAsRead([notification], read)}
        />
      );
    });
  }, [notifications, onMarkAsRead]);

  const anyUnread = notifications.some(notification => !notification.read);

  return (
    <div className='px-3 py-2'>
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
              onMarkAsRead(notifications, true);
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
