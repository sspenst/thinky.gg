import React, { useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import useUser from '../../hooks/useUser';
import Notification from '../../models/db/notification';
import BasicNotification from './basicNotification';
import FollowedUserPublishedLevelNotification from './followedUserPublishedLevel';
import NewRecordOnALevelYouBeatNotification from './newRecordOnALevelYouBeat';
import NewReviewOnYourLevelNotification from './newReviewOnYourLevel';

export enum NotificationType {
  BASIC = 'BASIC',
  FOLLOWED_USER_PUBLISHED_LEVEL = 'FOLLOWED_USER_PUBLISHED_LEVEL',
  NEW_REVIEW_ON_YOUR_LEVEL = 'NEW_REVIEW_ON_YOUR_LEVEL',
  NEW_RECORD_ON_A_LEVEL_YOU_BEAT = 'NEW_RECORD_ON_A_LEVEL_YOU_BEAT',
}

export interface NotificationListProps {
  onMarkAllAsRead?: () => void;
  onMarkAsRead?: (notification: Notification[]) => void;
  onMarkAsUnread?: (notification: Notification) => void;
  onRemove?: (notificationId: string) => void;
}

export default function NotificationList({ onMarkAllAsRead, onMarkAsRead, onMarkAsUnread, onRemove }: NotificationListProps): JSX.Element {
  const { mutateUser, user } = useUser();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  useEffect(() => {
    if (user) {
      setNotifications(user.notifications);
    }
  }, [user]);

  const _onMarkAsRead = useCallback(async (notifications: Notification[], read: boolean) => {
    const res = await fetch('/api/notification', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids: notifications.map((notification) => notification._id),
        read: read
      }),
    });

    if (res.status === 200) {
      const data = await res.json();

      if (onMarkAsRead) {
        onMarkAsRead(notifications);
      }

      // setData(data);
      mutateUser();
    } else {
      toast.dismiss();
      toast.error('Error marking notification as read');
    }
  }, [mutateUser, onMarkAsRead]);

  type ftype = ({ notification }: {notification: Notification}) => JSX.Element;

  const parsedNotifications = useCallback(() => {
    return notifications.map((notification) => {
      const notificationIndicatorUnread = ' p-1 w-5 h-4 bg-green-500 border rounded-full align-bottom self-center hover:bg-green-200';
      const notificationIndicatorRead = ' p-1 w-5 h-4 border rounded-full align-bottom self-center hover:bg-green-500';
      const typeMap: Record<NotificationType, ftype> = {
        [NotificationType.BASIC]: BasicNotification,
        [NotificationType.FOLLOWED_USER_PUBLISHED_LEVEL]: FollowedUserPublishedLevelNotification,
        [NotificationType.NEW_REVIEW_ON_YOUR_LEVEL]: NewReviewOnYourLevelNotification,
        [NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_BEAT]: NewRecordOnALevelYouBeatNotification,
      };
      const NotificationComponent = typeMap[notification.type as NotificationType] ?? BasicNotification;

      return <div key={'notification-' + notification._id} className="mt-2 p-3 border-slate-600 border rounded shadow flex flex-cols-3">

        <NotificationComponent notification={notification} />
        <button onClick={() => {_onMarkAsRead([notification], !notification.read);}} className={notification.read ? notificationIndicatorRead : notificationIndicatorUnread}></button>

      </div>;
    });
<<<<<<< Updated upstream
  }, [_onMarkAsRead, notifications]);
=======
  }, [_onMarkAsRead, data]);

  if (!data || data.length === 0) {
    return <div className="flex flex-col items-center justify-center w-full h-full">
      <p className="text-lg">You have no notifications</p>
    </div>;
  }

>>>>>>> Stashed changes
  const notifs = parsedNotifications();
  const anyUnread = notifications.some((notification) => !notification.read);

  return (
    <div className='p-3'>
      <div className='flex flex-cols-2 justify-between'>
        <h2 className="focus:outline-none text-xl font-semibold">Notifications</h2>
<<<<<<< Updated upstream
        <button disabled={!anyUnread}
          className='focus:outline-none text-sm hover:font-semibold' onClick={() => {
            _onMarkAsRead(notifications, true);
          }}>
=======
        {anyUnread && (
          <button
            className='focus:outline-none text-sm hover:font-semibold' onClick={() => {
              _onMarkAsRead(data, true);
            }}>
>>>>>>> Stashed changes
          Mark all read</button>
        )}
      </div>
      {notifs.length > 0 ? notifs : <p className="focus:outline-none text-sm">No notifications</p>}
    </div>
  );
}
