import React, { useCallback } from 'react';
import toast from 'react-hot-toast';
import Notification from '../../models/db/notification';
import BasicNotification from './basicNotification';
import FollowedUserPublishedLevelNotification from './followedUserPublishedLevel';
import NewRecordOnALevelYouBeatNotification from './newRecordOnALevelYouBeat';
import NewReviewOnYourLevelNotification from './newReviewOnYourLevel';

export enum NotificationType {
  FOLLOWED_USER_PUBLISHED_LEVEL = 'FOLLOWED_USER_PUBLISHED_LEVEL',
  NEW_REVIEW_ON_YOUR_LEVEL = 'NEW_REVIEW_ON_YOUR_LEVEL',
  NEW_RECORD_ON_A_LEVEL_YOU_BEAT = 'NEW_RECORD_ON_A_LEVEL_YOU_BEAT',
  BASIC = 'BASIC',
}

export interface NotificationListProps {
    notifications: Notification[];
    onMarkAllAsRead?: () => void;
    onMarkAsRead?: (notification: Notification[]) => void;
    onMarkAsUnread?: (notification: Notification) => void;
    onRemove?: (notificationId: string) => void;
}

export default function NotificationList({ notifications, onMarkAllAsRead, onMarkAsRead, onMarkAsUnread, onRemove, }: NotificationListProps): JSX.Element {
  // set state for notifications
  const [data, setData] = React.useState<Notification[]>(notifications);

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

      setData(data);
    } else {
      toast.dismiss();
      toast.error('Error marking notification as read');
    }
  }, [onMarkAsRead]);

  type ftype = ({ notification }: {notification: Notification}) => JSX.Element;

  const parsedNotifications = useCallback(() => {
    return data.map((notification) => {
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
  }, [_onMarkAsRead, data]);
  const notifs = parsedNotifications();
  const anyUnread = data.some((notification) => !notification.read);

  return (

    <div className='p-3'
      style={{
        backgroundColor: 'var(--bg-color)',
      }}>
      <div className='flex flex-cols-2 justify-between'>
        <h2 className="focus:outline-none text-xl font-semibold">Notifications</h2>
        <button disabled={!anyUnread}
          className='focus:outline-none text-sm hover:font-semibold' onClick={() => {
            _onMarkAsRead(data, true);
          }}>
          Mark all read</button>
      </div>
      {notifs.length > 0 ? notifs : <p className="focus:outline-none text-sm">No notifications</p>}

    </div>

  );
}
