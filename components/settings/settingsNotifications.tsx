import { EmailDigestSettingTypes } from '@root/constants/emailDigest';
import NotificationType from '@root/constants/notificationType';
import { AppContext } from '@root/contexts/appContext';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Select from 'react-select';

export default function SettingsNotifications() {
  const [emailDigest, setEmailDigest] = useState(EmailDigestSettingTypes.DAILY);
  const [isUserConfigLoading, setIsUserConfigLoading] = useState(false);
  const { mutateUser, userConfig } = useContext(AppContext);

  const emailDigestLabels = useMemo(() => {
    return {
      [EmailDigestSettingTypes.DAILY]: 'Daily',
      [EmailDigestSettingTypes.NONE]: 'None',
    };
  }, []);

  useEffect(() => {
    if (userConfig?.emailDigest) {
      setEmailDigest(userConfig.emailDigest);
    }
  }, [userConfig]);

  function updateUserConfig(
    body: string,
    property: string,
  ) {
    toast.dismiss();
    toast.loading(`Updating ${property}...`);
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

  const emailNotifs = userConfig?.emailNotificationsList || [];
  const pushNotifs = userConfig?.pushNotificationsList || [];
  // Create a formatted list of all notification types with two checkboxes... one for email and one for mobile push notifications.

  const updateNotifs = (notif: NotificationType, type: 'email' | 'push') => {
    const notifList = type === 'email' ? emailNotifs : pushNotifs;
    const notifIndex = notifList.indexOf(notif);

    if (notifIndex === -1) {
      notifList.push(notif);
    } else {
      notifList.splice(notifIndex, 1);
    }

    updateUserConfig(
      JSON.stringify({
        emailNotificationsList: emailNotifs,
        pushNotificationsList: pushNotifs,
      }),
      'notification settings',
    );
  };

  const notifList = (
    <div>
      <table className='table-fixed'>
        <thead>
          <tr className='border-b'>
            <th className='w-1/2 px-4 py-2 text-left'>Notification</th>
            <th className='px-4 py-2'>
              <div id='toggleAllEmailNotifs' className='flex justify-center gap-2'>
                <label className='text-sm' htmlFor='toggleAllEmailNotifs'>
                  Email
                </label>
                <input
                  checked={emailNotifs.length === allNotifs.length}
                  id='toggleAllEmailNotifs'
                  name='toggleAllEmailNotifs'

                  onChange={() => {
                    if (emailNotifs.length === allNotifs.length) {
                      updateUserConfig(
                        JSON.stringify({
                          emailNotificationsList: [],
                        }),
                        'notification settings',
                      );
                    } else {
                      updateUserConfig(
                        JSON.stringify({
                          emailNotificationsList: allNotifs,
                        }),
                        'notification settings',
                      );
                    }
                  }}
                  type='checkbox'
                />
              </div>
            </th>
            <th className='px-4 py-2'>
              <div id='toggleAllPushNotifs' className='flex justify-center gap-2'>
                <label className='text-sm' htmlFor='toggleAllPushNotifs'>
                  Push
                </label>
                <input
                  checked={pushNotifs.length === allNotifs.length}
                  id='toggleAllPushNotifs'
                  name='toggleAllPushNotifs'
                  onChange={() => {
                    if (pushNotifs.length === allNotifs.length) {
                      updateUserConfig(
                        JSON.stringify({
                          pushNotificationsList: [],
                        }),
                        'notification settings',
                      );
                    } else {
                      updateUserConfig(
                        JSON.stringify({
                          pushNotificationsList: allNotifs,
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
              <tr key={notif} className='border-b'>
                <td className='px-4 py-2'>
                  <label className='text-sm' htmlFor={notif}>
                    {label}
                  </label>
                </td>
                <td className='px-4 py-2 text-center'>
                  <input
                    checked={emailNotifs.includes(notif)}
                    id={notif + '-email'}
                    name={notif}
                    onChange={() => updateNotifs(notif, 'email')}
                    type='checkbox'
                  />
                </td>
                <td className='px-4 py-2 text-center'>
                  <input
                    checked={pushNotifs.includes(notif)}
                    id={notif + '-push'}
                    name={notif}
                    onChange={() => updateNotifs(notif, 'push')}
                    type='checkbox'
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className='flex flex-col items-center gap-8 mb-4'>
      <div>
        <div className='block font-bold mb-2'>
          Level of the day
        </div>
        <div>
          <Select
            className='text-black w-52 max-w-full text-sm'
            components={{
              IndicatorSeparator: null,
            }}
            isDisabled={isUserConfigLoading}
            isLoading={isUserConfigLoading}
            loadingMessage={() => 'Loading...'}
            onChange={option => {
              if (!option) {
                return;
              }

              updateUserConfig(
                JSON.stringify({
                  emailDigest: option.value,
                }), 'email notifications',
              );

              setEmailDigest(option.value);
            }}
            options={Object.keys(EmailDigestSettingTypes).map(emailDigestKey => {
              return {
                label: emailDigestLabels[emailDigestKey as EmailDigestSettingTypes],
                value: emailDigestKey as EmailDigestSettingTypes,
              };
            })}
            value={{
              label: emailDigestLabels[emailDigest],
              value: emailDigest,
            }}
          />
        </div>
      </div>
      {notifList}
    </div>
  );
}
