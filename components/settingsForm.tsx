import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { AppContext } from '../contexts/appContext';
import useUser from '../hooks/useUser';
import useUserConfig from '../hooks/useUserConfig';
import FormTemplate from './formTemplate';
import UploadImage from './uploadImage';

export default function SettingsForm() {
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [isUserConfigLoading, setIsUserConfigLoading] = useState<boolean>(false);
  const { mutateUser, user } = useUser();
  const { mutateUserConfig, userConfig } = useUserConfig();
  const [password, setPassword] = useState<string>('');
  const [password2, setPassword2] = useState<string>('');
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);
  const [showStatus, setShowStatus] = useState(true);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    if (user) {
      // TODO: EMAIL IS NOT RETURNED BECAUSE WE CLEAN THE USER (should not clean useUser)
      setEmail(user.email);
      setShowStatus(!user.hideStatus);
      setUsername(user.name);
    }
  }, [user]);

  function updateUser(
    body: string,
    property: string,
  ) {
    toast.loading(`Updating ${property}...`);
    setIsLoading(true);

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
      mutateUser().then(() => {
        setIsLoading(false);
      });
    });
  }

  function updateUserConfig(
    body: string,
    property: string,
  ) {
    toast.loading(`Updating ${property}...`);
    setIsLoading(true);
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
      mutateUserConfig().then(() => {
        setIsLoading(false);
        setIsUserConfigLoading(false);
      });
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

  function deleteAccount() {
    if (prompt('Are you sure you want to delete your account? Type DELETE to confirm.') === 'DELETE') {
      fetch('/api/user', {
        method: 'DELETE',
      }).then(() => {
        mutateUser(undefined);
        router.push('/');
      });
    }
  }

  const inputClass = 'shadow appearance-none border mb-2 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline';

  const getEmailDigestLabel = useCallback(() => {
    const digestValueToLabel = {
      'day': 'Daily digest',
      'notification': 'Only for unread notifications',
      'none': 'None',
    } as Record<string, string>;

    return digestValueToLabel[userConfig?.emailDigest || ''];
  }, [userConfig?.emailDigest]);

  return (
    <FormTemplate>
      <>
        <UploadImage />
        <div className='mt-2 mb-4'>
          <input
            checked={showStatus}
            name='showStatus'
            onChange={() => updateStatus()}
            style={{
              margin: '0 10px 0 0',
            }}
            type='checkbox'
          />
          <label className='text-sm' htmlFor='username'>
            Show online status
          </label>
        </div>
        <form onSubmit={updateUsername}>
          <div className='mb-4'>
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
          </div>
        </form>
        <form onSubmit={updateEmail}>
          <div className='mb-4'>
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
          </div>
        </form>
        <div className='mb-4'>
          <div className='block font-bold mb-2'>
            Email Notifications
          </div>
          <div>
            <Select
              onChange={(e: any) => {
                updateUserConfig(
                  JSON.stringify({
                    emailDigest: e.value,
                  }), 'email notifications',
                );
              }}
              components={{
                IndicatorSeparator: null,
              }}
              loadingMessage={() => 'Loading...'}
              isDisabled={isUserConfigLoading}
              isLoading={isUserConfigLoading}
              value={{ label: getEmailDigestLabel(), value: userConfig?.emailDigest }}
              className='text-black w-full text-sm'
              options={[
                {
                  label: 'Daily digest',
                  value: 'day',
                },
                {
                  label: 'Only for unread notifications',
                  value: 'notification',
                },
                {
                  label: 'None',
                  value: 'none',
                },
              ]}
            />
          </div>
        </div>
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
          <div className='mb-4'>
            <input onChange={e => setPassword2(e.target.value)} className={inputClass} type='password' placeholder='Re-enter new password' required />
            <button className='italic underline' type='submit'>Update</button>
          </div>
        </form>
        <div className='flex items-center justify-between'>
          <button onClick={deleteAccount} className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline' type='button'>
            Delete Account
          </button>
        </div>
      </>
    </FormTemplate>
  );
}
