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
      [EmailDigestSettingTypes.NONE]: 'None',
    };
  }, []);

  return (
    <div className='flex justify-center'>
      <div className='flex flex-col gap-6 w-full max-w-xs'>
        <div className='flex flex-col gap-2'>
          <div className='block font-bold'>
            Options
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
        <div>
          <div className='block font-bold mb-2'>
            Email Notifications
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
        </div>
        <form className='flex flex-col items-start' onSubmit={updateUsername}>
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
          <button className='italic underline' type='submit'>Update</button>
        </form>
        <form className='flex flex-col items-start' onSubmit={
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
          <button className='italic underline' type='submit'>
            {!userConfig?.emailConfirmed && email === user.email ? 'Resend confirmation' : 'Update'}
          </button>
        </form>
        <form className='flex flex-col items-start' onSubmit={updatePassword}>
          <label className='block font-bold mb-2' htmlFor='password'>
            Password
          </label>
          <input onChange={e => setCurrentPassword(e.target.value)} className={inputClass} id='password' value={currentPassword} type='password' placeholder='Enter current password' required />
          <input onChange={e => setPassword(e.target.value)} className={inputClass} type='password' placeholder='Enter new password' required />
          <input onChange={e => setPassword2(e.target.value)} className={inputClass} type='password' placeholder='Re-enter new password' required />
          <button className='italic underline' type='submit'>Update</button>
        </form>
      </div>
    </div>
  );
}
