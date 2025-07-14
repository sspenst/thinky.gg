import classNames from 'classnames';
import React, { useCallback } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import Notification from '../../models/db/notification';
import FormattedNotification from './formattedNotification';
import styles from './NotificationList.module.css';

interface NotificationListProps {
  close?: () => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export default function NotificationList({ close, notifications, setNotifications }: NotificationListProps) {
  const notificationActions = useNotifications({ notifications, setNotifications });

  const formattedNotifications = useCallback(() => {
    return notifications.map(notification => {
      return (
        <FormattedNotification
          close={close}
          key={'notification-' + notification._id}
          notification={notification}
          notificationActions={notificationActions}
        />
      );
    });
  }, [close, notifications, notificationActions]);

  const anyUnread = notifications.some(notification => !notification.read);

  return (
    <div className='px-3 py-2 flex flex-col gap-2'>
      <div className='flex flex-cols-2 justify-between gap-2'>
        <h2 className='focus:outline-none text-xl font-semibold'>Notifications</h2>
        <button
          disabled={!anyUnread}
          className={classNames(
            'focus:outline-none text-sm',
            anyUnread ? styles['unread'] : undefined,
          )}
          onClick={() => {
            if (anyUnread) {
              const unreadNotificationIds = notifications
                .filter(n => !n.read)
                .map(n => n._id.toString());

              notificationActions.markMultipleAsRead(unreadNotificationIds, true);
            }

            if (close) {
              close();
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
