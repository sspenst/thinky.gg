import React from 'react';
import Notification from '../../models/db/notification';
import BasicNotification from './basicNotification';
import FollowedUserPublishedLevelNotification from './followedUserPublishedLevel';
import NewReviewOnYourLevelNotification from './newReviewOnYourLevel';

export enum NotificationType {
  FOLLOWED_USER_PUBLISHED_LEVEL = 'FOLLOWED_USER_PUBLISHED_LEVEL',
  NEW_REVIEW_ON_YOUR_LEVEL = 'NEW_REVIEW_ON_YOUR_LEVEL',
  BASIC = 'BASIC',
}

export interface NotificationListProps {
    notifications: Notification[];
    onMarkAllAsRead?: () => void;
    onMarkAsRead?: (notificationId: string) => void;
    onMarkAsUnread?: (notificationId: string) => void;
    onRemove?: (notificationId: string) => void;
}

export default function NotificationList({ notifications, onMarkAllAsRead, onMarkAsRead, onMarkAsUnread, onRemove, }: NotificationListProps): JSX.Element {
  type ftype = ({ notification }: {notification: Notification}) => JSX.Element;

  const typeMap: Record<NotificationType, ftype> = {
    [NotificationType.BASIC]: BasicNotification,
    [NotificationType.FOLLOWED_USER_PUBLISHED_LEVEL]: FollowedUserPublishedLevelNotification,
    [NotificationType.NEW_REVIEW_ON_YOUR_LEVEL]: NewReviewOnYourLevelNotification,
  };
  const parsedNotifications = notifications.map((notification) => {
    const NotificationComponent = typeMap[notification.type as NotificationType] ?? BasicNotification;

    return <NotificationComponent key={'notification-' + notification._id} notification={notification} />;
  });

  return (

    <div className='p-3'>
      <h2 className="focus:outline-none text-2xl font-semibold  text-gray-800">Notifications</h2>
      {parsedNotifications}
    </div>

  );
}
