import FormattedNotification from '@root/components/notification/formattedNotification';
import React, { useCallback, useContext, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../contexts/appContext';
import Notification from '../models/db/notification';

export interface NotificationActions {
  markAsRead: (notificationId: string, read: boolean) => Promise<void>;
  markMultipleAsRead: (notificationIds: string[], read: boolean) => Promise<void>;
  updateNotificationState: (notificationId: string, read: boolean) => void;
  showNotificationToast: (notification: Notification) => void;
  handleSocketNotifications: (socketNotifications: Notification[]) => void;
}

interface UseNotificationsProps {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export function useNotifications({ notifications, setNotifications }: UseNotificationsProps): NotificationActions {
  const { mutateUser } = useContext(AppContext);
  const timeThresholdForNewNotificationToast = useRef(Date.now());

  const putNotification = useCallback(async (notificationIds: string[], read: boolean): Promise<void> => {
    const response = await fetch('/api/notification', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids: notificationIds,
        read: read
      }),
    });

    if (response.status !== 200) {
      throw new Error(await response.text());
    }

    if (mutateUser && typeof mutateUser === 'function') {
      mutateUser();
    }
  }, [mutateUser]);

  const updateNotificationState = useCallback((notificationId: string, read: boolean) => {
    setNotifications((prevNotifications: Notification[]) => {
      return prevNotifications.map(notification =>
        notification._id.toString() === notificationId
          ? { ...notification, read }
          : notification
      );
    });
  }, [setNotifications]);

  const markAsRead = useCallback(async (notificationId: string, read: boolean): Promise<void> => {
    try {
      // Optimistically update the UI
      updateNotificationState(notificationId, read);

      // Update the backend
      await putNotification([notificationId], read);
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Error marking notification as read');

      // Revert the optimistic update on error
      updateNotificationState(notificationId, !read);
    }
  }, [putNotification, updateNotificationState]);

  const markMultipleAsRead = useCallback(async (notificationIds: string[], read: boolean): Promise<void> => {
    try {
      // Optimistically update the UI
      notificationIds.forEach(id => updateNotificationState(id, read));

      // Update the backend
      await putNotification(notificationIds, read);
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Error marking notifications as read');

      // Revert the optimistic update on error
      notificationIds.forEach(id => updateNotificationState(id, !read));
    }
  }, [putNotification, updateNotificationState]);

  const showNotificationToast = useCallback((notification: Notification) => {
    // Create a toast-specific markAsRead that also dismisses the toast
    const toastMarkAsRead = async (notificationId: string, read: boolean): Promise<void> => {
      // Use the main markAsRead function to ensure proper state updates
      await markAsRead(notificationId, read);
      
      // Dismiss this specific toast after marking as read
      toast.dismiss(notification._id.toString() + 'toast');
    };

    // Create stable notification actions for the toast
    const toastNotificationActions = {
      markAsRead: toastMarkAsRead,
      markMultipleAsRead: async () => {}, // Not used in toast notifications
      updateNotificationState: () => {}, // Not used in toast notifications
      showNotificationToast: () => {}, // Not used in toast notifications
      handleSocketNotifications: () => {}, // Not used in toast notifications
    };

    toast.success(<FormattedNotification
      key={notification._id.toString() + 'toast'}
      notification={notification}
      notificationActions={toastNotificationActions}
    />, {
      id: notification._id.toString() + 'toast',
      duration: 3500,
      icon: null,
      position: 'bottom-right',
      style: {
        minWidth: '200px',
        backgroundColor: 'var(--bg-color)',
        color: 'var(--color)',
      }
    });
  }, [markAsRead]);

  const handleSocketNotifications = useCallback((socketNotifications: Notification[]) => {
    // Find new notifications that are unread and recent
    const newNotifications = socketNotifications
      .filter(n =>
        n.read === false &&
        new Date(n.createdAt).getTime() >= (timeThresholdForNewNotificationToast.current ? new Date(timeThresholdForNewNotificationToast.current).getTime() : 0)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    timeThresholdForNewNotificationToast.current = Date.now();

    // Show toast notifications for new notifications
    for (const notification of newNotifications) {
      showNotificationToast(notification);
    }

    // Update the notifications list
    setNotifications(socketNotifications);
  }, [showNotificationToast, setNotifications]);

  return useMemo(() => ({
    markAsRead,
    markMultipleAsRead,
    updateNotificationState,
    showNotificationToast,
    handleSocketNotifications,
  }), [markAsRead, markMultipleAsRead, updateNotificationState, showNotificationToast, handleSocketNotifications]);
}
