import classNames from 'classnames';
import React, { useCallback, useContext } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import Notification from '../../models/db/notification';
import LoadingSpinner from '../page/loadingSpinner';
import FormattedNotification from './formattedNotification';
import styles from './NotificationList.module.css';

interface NotificationListProps {
  close?: () => void;
  isLoading?: boolean;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export default function NotificationList({ close, isLoading, notifications, setNotifications }: NotificationListProps) {
  const { mutateUser } = useContext(AppContext);

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
        if (mutateUser) {
          mutateUser();
        }
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error marking notification as read');
    });
  }, [mutateUser]);

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
          close={close}
          key={'notification-' + notification._id}
          notification={notification}
          onMarkAsRead={(read: boolean) => onMarkAsRead([notification], read)}
        />
      );
    });
  }, [close, notifications, onMarkAsRead]);

  const anyUnread = notifications.some(notification => !notification.read);

  return (
    <div className='px-3 py-2 flex flex-col gap-2'>
      <div className='flex flex-cols-2 justify-between gap-2'>
        <h2 className='focus:outline-none text-xl font-semibold'>Notifications</h2>
        { !isLoading && <button
          disabled={!anyUnread}
          className={classNames(
            'focus:outline-none text-sm',
            anyUnread ? styles['unread'] : undefined,
          )}
          onClick={() => {
            if (anyUnread) {
              onMarkAsRead(notifications, true);
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
        }
      </div>

      {formattedNotifications().length > 0 ?
        formattedNotifications() :
        (!isLoading && <p className='text-sm pt-2 justify-center flex'>No notifications!</p>)
      }
      { isLoading && (
        <div className='flex justify-center m-2'>
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}
