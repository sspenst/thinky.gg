import { EmailDigestSettingType } from '@root/constants/emailDigest';
import NotificationType from '@root/constants/notificationType';
import { AppContext } from '@root/contexts/appContext';
import isGuest from '@root/helpers/isGuest';
import { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function SettingsNotifications() {
  const [isUserConfigLoading, setIsUserConfigLoading] = useState(false);
  const { mutateUser, user, userConfig } = useContext(AppContext);
  
  // Local state for tracking changes
  const [localDisallowedEmail, setLocalDisallowedEmail] = useState<NotificationType[]>([]);
  const [localDisallowedPush, setLocalDisallowedPush] = useState<NotificationType[]>([]);
  const [localDisallowedInbox, setLocalDisallowedInbox] = useState<NotificationType[]>([]);
  const [localEmailDigest, setLocalEmailDigest] = useState(EmailDigestSettingType.DAILY);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      setLocalEmailDigest(user.emailDigest);
      setLocalDisallowedEmail(user.disallowedEmailNotifications ?? []);
      setLocalDisallowedPush(user.disallowedPushNotifications ?? []);
      setLocalDisallowedInbox(user.disallowedInboxNotifications ?? []);
    }
  }, [user]);

  // Check if there are unsaved changes
  useEffect(() => {
    if (!user) return;
    
    const emailChanged = JSON.stringify(localDisallowedEmail.sort()) !== JSON.stringify((user.disallowedEmailNotifications ?? []).sort());
    const pushChanged = JSON.stringify(localDisallowedPush.sort()) !== JSON.stringify((user.disallowedPushNotifications ?? []).sort());
    const inboxChanged = JSON.stringify(localDisallowedInbox.sort()) !== JSON.stringify((user.disallowedInboxNotifications ?? []).sort());
    const digestChanged = localEmailDigest !== user.emailDigest;
    
    setHasChanges(emailChanged || pushChanged || inboxChanged || digestChanged);
  }, [localDisallowedEmail, localDisallowedPush, localDisallowedInbox, localEmailDigest, user]);

  function saveChanges() {
    setIsUserConfigLoading(true);

    const body = {
      disallowedEmailNotifications: localDisallowedEmail,
      disallowedPushNotifications: localDisallowedPush,
      disallowedInboxNotifications: localDisallowedInbox,
      emailDigest: localEmailDigest,
    };

    fetch('/api/user-config', {
      method: 'PUT',
      body: JSON.stringify(body),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async res => {
      const { updated } = await res.json();

      if (!updated) {
        toast.dismiss();
        toast.error('Error updating notification settings');
      } else {
        toast.dismiss();
        toast.success('Notification settings updated');
        setHasChanges(false);
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error updating notification settings');
    }).finally(() => {
      mutateUser();
      setIsUserConfigLoading(false);
    });
  }

  function cancelChanges() {
    if (user) {
      setLocalDisallowedEmail(user.disallowedEmailNotifications ?? []);
      setLocalDisallowedPush(user.disallowedPushNotifications ?? []);
      setLocalDisallowedInbox(user.disallowedInboxNotifications ?? []);
      setLocalEmailDigest(user.emailDigest);
      setHasChanges(false);
    }
  }

  // Group notifications by category for better organization
  const notificationGroups = {
    'Daily Content': [
      {
        type: NotificationType.LEVEL_OF_DAY,
        label: 'Level of the day',
        description: 'Daily featured level recommendations'
      }
    ],
    'Community & Social': [
      {
        type: NotificationType.NEW_FOLLOWER,
        label: 'New follower',
        description: 'When someone starts following you'
      },
      {
        type: NotificationType.NEW_LEVEL,
        label: 'New level from someone you follow',
        description: 'When creators you follow publish new levels'
      },
      {
        type: NotificationType.NEW_WALL_POST,
        label: 'Profile comments',
        description: 'When someone comments on your profile'
      },
      {
        type: NotificationType.NEW_WALL_REPLY,
        label: 'Comment replies',
        description: 'When someone replies to your comments'
      }
    ],
    'Your Content': [
      {
        type: NotificationType.NEW_REVIEW_ON_YOUR_LEVEL,
        label: 'Reviews on your levels',
        description: 'When someone reviews your levels'
      },
      {
        type: NotificationType.NEW_LEVEL_ADDED_TO_COLLECTION,
        label: 'Level added to collection',
        description: 'When your level is added to a collection'
      },
      {
        type: NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_SOLVED,
        label: 'New records',
        description: 'When someone beats your record on a level'
      }
    ],
    'Achievements & Account': [
      {
        type: NotificationType.NEW_ACHIEVEMENT,
        label: 'New achievement',
        description: 'When you unlock achievements'
      },
      {
        type: NotificationType.UPGRADED_TO_PRO,
        label: 'Pro upgrade',
        description: 'Account upgrade confirmations'
      },
      {
        type: NotificationType.ADMIN_MESSAGE,
        label: 'Admin messages',
        description: 'Important announcements from administrators'
      }
    ]
  };

  const allNotifs = Object.values(NotificationType);

  if (!user || !userConfig) {
    return null;
  }

  // Update local notification preferences
  const updateNotifs = (notif: NotificationType, type: 'email' | 'push' | 'inbox') => {
    if (type === 'email') {
      const newList = [...localDisallowedEmail];
      const index = newList.indexOf(notif);
      if (index === -1) {
        newList.push(notif);
      } else {
        newList.splice(index, 1);
      }
      setLocalDisallowedEmail(newList);
    } else if (type === 'push') {
      const newList = [...localDisallowedPush];
      const index = newList.indexOf(notif);
      if (index === -1) {
        newList.push(notif);
      } else {
        newList.splice(index, 1);
      }
      setLocalDisallowedPush(newList);
    } else {
      const newList = [...localDisallowedInbox];
      const index = newList.indexOf(notif);
      if (index === -1) {
        newList.push(notif);
      } else {
        newList.splice(index, 1);
      }
      setLocalDisallowedInbox(newList);
    }
  };

  const guest = isGuest(user);

  const NotificationToggle = ({ notif, type }: { notif: NotificationType, type: 'email' | 'push' | 'inbox' }) => (
    <label className='relative inline-flex items-center cursor-pointer'>
      <input
        type='checkbox'
        className='sr-only peer'
        checked={
          type === 'email' ? !localDisallowedEmail.includes(notif) :
          type === 'push' ? !localDisallowedPush.includes(notif) :
          !localDisallowedInbox.includes(notif)
        }
        disabled={isUserConfigLoading}
        onChange={() => updateNotifs(notif, type)}
      />
      <div className='w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[""] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600' />
    </label>
  );

  const GlobalToggle = ({ type }: { type: 'email' | 'push' | 'inbox' }) => {
    const isAllEnabled = type === 'email' ? localDisallowedEmail.length === 0 :
                        type === 'push' ? localDisallowedPush.length === 0 :
                        localDisallowedInbox.length === 0;

    return (
      <label className='relative inline-flex items-center cursor-pointer'>
        <input
          type='checkbox'
          className='sr-only peer'
          checked={isAllEnabled}
          disabled={isUserConfigLoading}
          onChange={() => {
            if (type === 'email') {
              setLocalDisallowedEmail(isAllEnabled ? allNotifs : []);
            } else if (type === 'push') {
              setLocalDisallowedPush(isAllEnabled ? allNotifs : []);
            } else {
              setLocalDisallowedInbox(isAllEnabled ? allNotifs : []);
            }
          }}
        />
        <div className='w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[""] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600' />
      </label>
    );
  };

  return (
    <div className={`flex flex-col gap-8 max-w-4xl mx-auto p-6 ${hasChanges ? 'pb-24' : ''}`}>
      {/* Header with global toggles */}
      <div className='text-center'>
        <h2 className='text-2xl font-bold mb-4'>Notification Preferences</h2>
        <p className='text-gray-600 dark:text-gray-400 mb-6'>
          Choose how you want to be notified about activity and updates
        </p>
        
        <div className='flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 mb-6'>
          {!guest && (
            <div className='flex items-center gap-3'>
              <span className='text-sm font-medium'>Toggle All Email</span>
              <GlobalToggle type='email' />
            </div>
          )}
          <div className='flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6'>
            <div className='flex items-center gap-3'>
              <span className='text-sm font-medium'>Toggle All Mobile Push</span>
              <GlobalToggle type='push' />
            </div>
            <div className='flex items-center gap-2 text-xs'>
              <span className='text-gray-500 dark:text-gray-400'>Get the app:</span>
              <a 
                href="https://apps.apple.com/app/pathology-block-pushing-game/id1668925562" 
                target="_blank" 
                rel="noopener noreferrer"
                className='flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
              >
                <svg className='w-4 h-4' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z'/>
                </svg>
                iOS
              </a>
              <a 
                href="https://play.google.com/store/apps/details?id=com.pathology.gg" 
                target="_blank" 
                rel="noopener noreferrer"
                className='flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
              >
                <svg className='w-4 h-4' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z'/>
                </svg>
                Android
              </a>
            </div>
          </div>
        </div>
      </div>
      {/* Notification groups */}
      {Object.entries(notificationGroups).map(([groupName, notifications]) => (
        <div key={groupName}>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
            <h3 className='text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100'>
              {groupName}
            </h3>
            
            <div className='space-y-4'>
              {notifications.map(({ type, label, description }) => (
                <div key={type} className='flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg gap-3'>
                  <div className='flex-1'>
                    <h4 className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                      {label}
                    </h4>
                    <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                      {description}
                    </p>
                  </div>
                  
                  <div className='flex items-center gap-4 sm:gap-6 sm:ml-4'>
                    {!guest && type !== NotificationType.LEVEL_OF_DAY && (
                      <div className='flex items-center gap-2'>
                        <span className='text-xs text-gray-600 dark:text-gray-400'>Email</span>
                        <NotificationToggle notif={type} type='email' />
                      </div>
                    )}
                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-gray-600 dark:text-gray-400'>Mobile app</span>
                      <NotificationToggle notif={type} type='push' />
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-gray-600 dark:text-gray-400'>Inbox</span>
                      <NotificationToggle notif={type} type='inbox' />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Email digest settings - show after Daily Content section */}
          {groupName === 'Daily Content' && !guest && (
            <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 mt-8'>
              <h3 className='text-lg font-semibold mb-2 text-blue-900 dark:text-blue-100'>
                📧 Email Digest
              </h3>
              <p className='text-sm text-blue-700 dark:text-blue-300 mb-4'>
                Receive a daily summary email with level of the day and recent notifications
              </p>
              
              <div className='flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4'>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='radio'
                    name='emailDigest'
                    checked={localEmailDigest === EmailDigestSettingType.DAILY}
                    disabled={isUserConfigLoading}
                    onChange={() => {
                      setLocalEmailDigest(EmailDigestSettingType.DAILY);
                    }}
                    className='text-blue-600'
                  />
                  <span className='text-sm'>Daily digest</span>
                </label>
                
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='radio'
                    name='emailDigest'
                    checked={localEmailDigest === EmailDigestSettingType.NONE}
                    disabled={isUserConfigLoading}
                    onChange={() => {
                      setLocalEmailDigest(EmailDigestSettingType.NONE);
                    }}
                    className='text-blue-600'
                  />
                  <span className='text-sm'>No digest emails</span>
                </label>
              </div>
            </div>
          )}
        </div>
      ))}
      
      {/* Fixed save button */}
      {hasChanges && (
        <div className='fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg z-10'>
          <div className='max-w-4xl mx-auto flex flex-col sm:flex-row justify-end gap-2 sm:gap-4'>
            <button
              onClick={saveChanges}
              disabled={isUserConfigLoading}
              className='px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2'
            >
              {isUserConfigLoading ? (
                <>
                  <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <button
              onClick={cancelChanges}
              disabled={isUserConfigLoading}
              className='px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50'
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
