import NotificationType from '@root/constants/notificationType';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import React, { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { EmailDigestSettingTypes } from '../../constants/emailDigest';

interface SettingsAccountProps {
  user: User;
  userConfig: UserConfig | null;
}

export default function SettingsAccount({ user, userConfig }: SettingsAccountProps) {
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [email, setEmail] = useState<string>(user.email);
  const [emailDigest, setEmailDigest] = useState<EmailDigestSettingTypes>(userConfig?.emailDigest ?? EmailDigestSettingTypes.ONLY_NOTIFICATIONS);
  const [isUserConfigLoading, setIsUserConfigLoading] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [password2, setPassword2] = useState<string>('');
  const [showPlayStats, setShowPlayStats] = useState(userConfig?.showPlayStats ?? false);
  const [emailOnPrivateMessage, setEmailOnPrivateMessage] = useState<NotificationType[]>(userConfig?.emailNotificationsList ?? []);
  const [showStatus, setShowStatus] = useState(!user.hideStatus);
  const [username, setUsername] = useState<string>(user.name);

  function updateUser(
    body: string,
    property: string,
  ) {
    toast.dismiss();
    toast.loading(`Updating ${property}...`);

    fetch('/api/user', {
      method: 'PUT',
      body: body,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(res => {
      if (res.status !== 200) {
        throw res.text();
      } else {
        toast.dismiss();
        toast.success(`Updated ${property}`);
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || `Error updating ${property}`);
    });
  }

  function resendEmailConfirmation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    toast.dismiss();
    toast.loading('Resending activation email...');

    fetch('/api/user', {
      method: 'PUT',
      body: JSON.stringify({
        email: email,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(res => {
      if (res.status !== 200) {
        throw res.text();
      } else {
        toast.dismiss();
        toast.success('Sent email activation');
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Error sending confirmation email');
    });
  }

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
      setIsUserConfigLoading(false);
    });
  }

  function updateStatus() {
    updateUser(
      JSON.stringify({
        hideStatus: showStatus,
      }),
      'online status',
    );

    setShowStatus(prevShowStatus => !prevShowStatus);
  }

  function updateUsername(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (username.length < 3 || username.length > 50) {
      toast.dismiss();
      toast.error('Username must be between 3 and 50 characters');

      return;
    }

    updateUser(
      JSON.stringify({
        name: username,
      }),
      'username',
    );
  }

  function updateEmail(e: React.FormEvent<HTMLFormElement>) {
    if (email.length < 3 || email.length > 50) {
      toast.dismiss();
      toast.error('Email must be between 3 and 50 characters');

      return;
    }

    e.preventDefault();

    updateUser(
      JSON.stringify({
        email: email,
      }),
      'email',
    );
  }

  function updatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password.length < 8 || password.length > 50) {
      toast.dismiss();
      toast.error('Password must be at least 8 characters');

      return;
    }

    if (password !== password2) {
      toast.error('Password does not match');

      return;
    }

    updateUser(
      JSON.stringify({
        currentPassword: currentPassword,
        password: password,
      }),
      'password',
    );
  }

  const inputClass = 'shadow appearance-none border mb-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline';

  const emailDigestLabels = useCallback(() => {
    return {
      [EmailDigestSettingTypes.DAILY]: 'Daily digest',
      [EmailDigestSettingTypes.ONLY_NOTIFICATIONS]: 'Only for unread notifications',
      [EmailDigestSettingTypes.NONE]: 'No daily digest',
    };
  }, []);

  async function clearTours() {
    const res = await fetch('/api/user-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toursCompleted: [],
      }),
    });

    if (!res.ok) {
      toast.dismiss();
      toast.error('Error occured');
    } else {
      toast.dismiss();
      toast.success('Onboarding tooltips reset');
    }
  }

  // NotificationType is an enum
  const allNotifs = Object.values(NotificationType);

  const notifLabels = {
    [NotificationType.NEW_ACHIEVEMENT]: 'New achievement',
    [NotificationType.NEW_FOLLOWER]: 'New follower',
    [NotificationType.NEW_LEVEL]: 'New level from someone you follow',
    [NotificationType.NEW_LEVEL_ADDED_TO_COLLECTION]: 'One of your created levels added to a collection',
    [NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_BEAT]: 'New record on a level you previous beat',
    [NotificationType.NEW_REVIEW_ON_YOUR_LEVEL]: 'New review on one of your levels',
    [NotificationType.NEW_WALL_POST]: 'Someone posts to your profile',
    [NotificationType.NEW_WALL_REPLY]: 'Someone replies to your post',
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

  console.log(emailNotifs);
  const notifList = (
    <table className='table-fixed'>
      <thead>
        <tr className='border-b'>
          <th className='w-1/2 px-4 py-2'>Notification</th>
          <th className='w-1/4 px-4 py-2'>Email</th>
          <th className='w-1/4 px-4 py-2'>Push</th>
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
  );

  return (
    <div className='flex justify-center'>
      <div className='flex flex-col gap-6 p-6'>

        <div>
          <form className='flex flex-col items-start mt-4' onSubmit={updateUsername}>
            <label className='block font-bold mb-2' htmlFor='username'>
            Username
            </label>
            <input
              className={inputClass}
              id='username'
              name='username'
              onChange={e => setUsername(e.target.value)}
              placeholder='Username'
              required
              type='text'
              value={username}
            />
            <button className='italic underline mb-4' type='submit'>Update</button>
          </form>
          <form className='flex flex-col items-start ' onSubmit={
            (!userConfig?.emailConfirmed && email === user.email ? resendEmailConfirmation : updateEmail)
          }>
            <label className='block font-bold mb-2' htmlFor='email'>
              {'Email - '}
              {userConfig?.emailConfirmed && email === user.email ?
                <span className='text-green-500'>Confirmed</span>
                :
                <span className='text-red-500'>Unconfirmed</span>
              }
            </label>
            <input
              className={inputClass}
              id='email'
              name='email'
              onChange={e => setEmail(e.target.value)}
              placeholder='Email'
              required
              type='email'
              value={email}
            />
            <button className='italic underline mb-4' type='submit'>
              {!userConfig?.emailConfirmed && email === user.email ? 'Resend confirmation' : 'Update'}
            </button>
          </form>
          <form className='flex flex-col items-start' onSubmit={updatePassword}>
            <label className='block font-bold mb-2' htmlFor='password'>
            Password
            </label>
            <input autoComplete='current-password'
              onChange={e => setCurrentPassword(e.target.value)} className={inputClass} id='password' value={currentPassword} type='password' placeholder='Enter current password' required />
            <input autoComplete='new-password'
              onChange={e => setPassword(e.target.value)} className={inputClass} type='password' placeholder='Enter new password' required />
            <input autoComplete='new-password'
              onChange={e => setPassword2(e.target.value)} className={inputClass} type='password' placeholder='Re-enter new password' required />
            <button className='italic underline mb-4' type='submit'>Update</button>
          </form>
          {notifList}

        </div>
        <div className='flex flex-col p-3'>

          <div className='flex flex-col gap-2'>
            <div className='block font-bold'>
            Options
            </div>
            <div>
              <Select
                className='text-black w-full text-sm'
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
                    label: emailDigestLabels()[emailDigestKey as EmailDigestSettingTypes],
                    value: emailDigestKey as EmailDigestSettingTypes,
                  };
                })}
                value={{
                  label: emailDigestLabels()[emailDigest],
                  value: emailDigest,
                }}
              />
            </div>
            <div className='flex gap-2'>
              <input
                checked={showStatus}
                id='showStatus'
                name='showStatus'
                onChange={() => updateStatus()}
                type='checkbox'
              />
              <label className='text-sm' htmlFor='showStatus'>
              Show online status
              </label>
            </div>
            <div className='flex gap-2'>
              <input
                checked={showPlayStats}
                id='showPlayStats'
                name='showPlayStats'
                onChange={() => {
                  updateUserConfig(JSON.stringify({ showPlayStats: !showPlayStats }), 'play stats in level info');
                  setShowPlayStats(prevShowPlayStats => !prevShowPlayStats);
                }}
                type='checkbox'
              />
              <label className='text-sm' htmlFor='showPlayStats'>
              Show play stats in level info
              </label>
            </div>
          </div>

          {userConfig && userConfig.toursCompleted?.length > 0 &&
          <button className='italic underline' onClick={() => {
            if (confirm('This will show the onboarding tooltips again. Are you sure?')) {
              clearTours();
            }
          }}>
            Reset onboarding tooltips
          </button>
          }
        </div>
      </div>
    </div>
  );
}
