import { EmailDigestSettingType } from '@root/constants/emailDigest';
import NotificationType from '@root/constants/notificationType';
import { AppContext } from '@root/contexts/appContext';
import isGuest from '@root/helpers/isGuest';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function SettingsNotifications() {
  const [emailDigest, setEmailDigest] = useState(EmailDigestSettingType.DAILY);
  const [isUserConfigLoading, setIsUserConfigLoading] = useState(false);
  const { mutateUser, user, userConfig } = useContext(AppContext);

  useEffect(() => {
    if (user?.emailDigest) {
      setEmailDigest(user.emailDigest);
    }
  }, [user]);

  function updateUserConfig(
    body: string,
    property: string,
  ) {
    setIsUserConfigLoading(true);

    fetch('/api/user-config', {
      method: 'PUT',
      body: body,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async res => {
      const { updated } = await res.json();

      if (!updated) {
        toast.dismiss();
        toast.error(`Error updating ${property}`);
      } else {
        toast.dismiss();
        toast.success(`Updated ${property}`);
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error(`Error updating ${property}`);
    }).finally(() => {
      mutateUser();
      setIsUserConfigLoading(false);
    });
  }

  const allNotifs = Object.values(NotificationType);

  const notifLabels = {
    [NotificationType.ADMIN_MESSAGE]: 'Admin message',
    [NotificationType.NEW_ACHIEVEMENT]: 'New achievement',
    [NotificationType.NEW_FOLLOWER]: 'New follower',
    [NotificationType.NEW_LEVEL]: 'New level from someone you follow',
    [NotificationType.NEW_LEVEL_ADDED_TO_COLLECTION]: 'Someone adds your level to a collection',
    [NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_SOLVED]: 'New record on a level you previously solved',
    [NotificationType.NEW_REVIEW_ON_YOUR_LEVEL]: 'New review on one of your levels',
    [NotificationType.NEW_WALL_POST]: 'New profile comment',
    [NotificationType.NEW_WALL_REPLY]: 'New reply to profile comment',
    [NotificationType.UPGRADED_TO_PRO]: 'Upgraded to Pro',
  };

  if (!user || !userConfig) {
    return null;
  }

  const disallowedEmailNotifications = user.disallowedEmailNotifications ?? [];
  const disallowedPushNotifications = user.disallowedPushNotifications ?? [];

  // Create a formatted list of all notification types with two checkboxes... one for email and one for mobile push notifications.
  const updateNotifs = (notif: NotificationType, type: 'email' | 'push') => {
    const notifList = type === 'email' ? disallowedEmailNotifications : disallowedPushNotifications;
    const notifIndex = notifList.indexOf(notif);

    if (notifIndex === -1) {
      notifList.push(notif);
    } else {
      notifList.splice(notifIndex, 1);
    }

    updateUserConfig(
      JSON.stringify({
        disallowedEmailNotifications: disallowedEmailNotifications,
        disallowedPushNotifications: disallowedPushNotifications,
      }),
      'notification settings',
    );
  };

  const guest = isGuest(user);

  return (
    <div className='flex flex-col items-center gap-6 mb-4'>
      <div className='max-w-sm'>
        <table className='table-fixed'>
          <thead>
            <tr className='border-b' style={{ borderColor: 'var(--bg-color-4)' }}>
              <th className='p-2 text-left'>Notifications</th>
              {!guest &&
                <th className='p-2'>
                  <div id='toggleAllEmailNotifs' className='flex justify-center gap-2'>
                    <label className='text-sm' htmlFor='toggleAllEmailNotifs'>
                    Email
                    </label>
                    <input
                      checked={disallowedEmailNotifications.length === 0}
                      disabled={isUserConfigLoading}
                      id='toggleAllEmailNotifs'
                      name='toggleAllEmailNotifs'
                      onChange={() => {
                        if (disallowedEmailNotifications.length !== 0) {
                          updateUserConfig(
                            JSON.stringify({
                              disallowedEmailNotifications: [],
                            }),
                            'notification settings',
                          );
                        } else {
                          updateUserConfig(
                            JSON.stringify({
                              disallowedEmailNotifications: allNotifs,
                            }),
                            'notification settings',
                          );
                        }
                      }}
                      type='checkbox'
                    />
                  </div>
                </th>
              }
              <th className='p-2 pl-4'>
                <div id='toggleAllPushNotifs' className='flex justify-center gap-2'>
                  <label className='text-sm' htmlFor='toggleAllPushNotifs'>
                    Push
                  </label>
                  <input
                    checked={disallowedPushNotifications.length === 0}
                    disabled={isUserConfigLoading}
                    id='toggleAllPushNotifs'
                    name='toggleAllPushNotifs'
                    onChange={() => {
                      if (disallowedPushNotifications.length !== 0) {
                        updateUserConfig(
                          JSON.stringify({
                            disallowedPushNotifications: [],
                          }),
                          'notification settings',
                        );
                      } else {
                        updateUserConfig(
                          JSON.stringify({
                            disallowedPushNotifications: allNotifs,
                          }),
                          'notification settings',
                        );
                      }
                    }}
                    type='checkbox'
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {allNotifs.map((notif) => {
              const label = notifLabels[notif];

              return (
                <tr key={notif} className='border-b' style={{ borderColor: 'var(--bg-color-4)' }}>
                  <td className='p-2'>
                    <label className='text-sm' htmlFor={notif}>
                      {label}
                    </label>
                  </td>
                  {!guest &&
                    <td className='p-2 text-center'>
                      <input
                        checked={!disallowedEmailNotifications.includes(notif)}
                        disabled={isUserConfigLoading}
                        id={notif + '-email'}
                        name={notif}
                        onChange={() => updateNotifs(notif, 'email')}
                        type='checkbox'
                      />
                    </td>
                  }
                  <td className='p-2 text-center'>
                    <input
                      checked={!disallowedPushNotifications.includes(notif)}
                      disabled={isUserConfigLoading}
                      id={notif + '-push'}
                      name={notif}
                      onChange={() => updateNotifs(notif, 'push')}
                      type='checkbox'
                    />
                  </td>
                </tr>
              );
            })}
            {!guest &&
              <tr key='level-of-the-day' className='border-b' style={{ borderColor: 'var(--bg-color-4)' }}>
                <td className='p-2'>
                  <label className='text-sm' htmlFor='level-of-the-day'>
                    Level of the day
                  </label>
                </td>
                <td className='px-4 py-2 text-center'>
                  <input
                    checked={emailDigest === EmailDigestSettingType.DAILY}
                    disabled={isUserConfigLoading}
                    id='level-of-the-day'
                    name='level-of-the-day'
                    onChange={option => {
                      if (!option) {
                        return;
                      }

                      const newEmailDigest = emailDigest === EmailDigestSettingType.DAILY ? EmailDigestSettingType.NONE : EmailDigestSettingType.DAILY;

                      updateUserConfig(
                        JSON.stringify({
                          emailDigest: newEmailDigest,
                        }), 'notification settings',
                      );

                      setEmailDigest(newEmailDigest);
                    }}
                    type='checkbox'
                  />
                </td>
                <td className='px-4 py-2 text-center'>
                  {null}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
