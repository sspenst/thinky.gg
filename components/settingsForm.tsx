import React, { useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { EmailDigestSettingTypes } from '../constants/emailDigest';
import { AppContext } from '../contexts/appContext';
import FormTemplate from './formTemplate';

export default function SettingsForm() {
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [emailDigest, setEmailDigest] = useState<EmailDigestSettingTypes>(EmailDigestSettingTypes.ONLY_NOTIFICATIONS);

  const [isUserConfigLoading, setIsUserConfigLoading] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [password2, setPassword2] = useState<string>('');
  const { mutateUser, user, userConfig } = useContext(AppContext);
  const [showPlayStats, setShowPlayStats] = useState(false);
  const [showStatus, setShowStatus] = useState(true);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setShowStatus(!user.hideStatus);
      setUsername(user.name);
    }
  }, [user]);

  useEffect(() => {
    if (userConfig) {
      setEmailDigest(userConfig.emailDigest ?? EmailDigestSettingTypes.ONLY_NOTIFICATIONS);
      setShowPlayStats(!!userConfig.showPlayStats);
    }
  }, [userConfig]);

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
      mutateUser();
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

    updateUser(
      JSON.stringify({
        name: username,
      }),
      'username',
    );
  }

  function updateEmail(e: React.FormEvent<HTMLFormElement>) {
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

  return (<>
    <div className='font-bold text-center'>Account Settings</div>
    <FormTemplate>
      <div className='flex flex-col gap-3'>

        <div className='flex flex-col gap-2'>

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
                updateUserConfig(JSON.stringify({ showPlayStats: !showPlayStats }), 'showPlayStats');
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
        <form onSubmit={updateUsername}>
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
        <form onSubmit={updateEmail}>
          <label className='block font-bold mb-2' htmlFor='email'>
            Email
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
          <button className='italic underline' type='submit'>Update</button>
        </form>
        <form onSubmit={updatePassword}>
          <div>
            <label className='block font-bold mb-2' htmlFor='password'>
              Password
            </label>
            <input onChange={e => setCurrentPassword(e.target.value)} className={inputClass} id='password' value={currentPassword} type='password' placeholder='Enter current password' required />
          </div>
          <div>
            <input onChange={e => setPassword(e.target.value)} className={inputClass} type='password' placeholder='Enter new password' required />
          </div>
          <div>
            <input onChange={e => setPassword2(e.target.value)} className={inputClass} type='password' placeholder='Re-enter new password' required />
            <button className='italic underline' type='submit'>Update</button>
          </div>
        </form>
      </div>
    </FormTemplate>

  </>);
}
