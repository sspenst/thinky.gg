import SettingsAccount from '@root/components/settings/settingsAccount';
import SettingsAccountGuest from '@root/components/settings/settingsAccountGuest';
import SettingsDelete from '@root/components/settings/settingsDelete';
import SettingsNotifications from '@root/components/settings/settingsNotifications';
import isGuest from '@root/helpers/isGuest';
import User from '@root/models/db/user';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Page from '../../../components/page/page';
import SettingsGeneral from '../../../components/settings/settingsGeneral';
import { getUserFromToken } from '../../../lib/withAuth';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/login' + (context.resolvedUrl ? '?redirect=' + encodeURIComponent(context.resolvedUrl) : ''),
        permanent: false,
      },
    };
  }

  return {
    props: {
      user: JSON.parse(JSON.stringify(reqUser)),
    } as SettingsProps,
  };
}

interface SettingsProps {
  user: User;
}

type TabType = 'general' | 'account' | 'security' | 'notifications' | 'danger';

/* istanbul ignore next */
export default function Settings({ user }: SettingsProps) {
  const guest = isGuest(user);
  const [activeTab, setActiveTab] = useState<TabType>(guest ? 'account' : 'general');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [password2, setPassword2] = useState<string>('');

  function updateUser(
    body: string,
    property: string,
  ) {
    toast.dismiss();
    const toastId = toast.loading(`Updating ${property}...`);

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
        toast.success(`Updated ${property}`, { id: toastId });
      }
    }).catch(async err => {
      console.error(err);
      toast.error(JSON.parse(await err)?.error || `Error updating ${property}`, { id: toastId });
    });
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

    // Clear form after successful submission
    setCurrentPassword('');
    setPassword('');
    setPassword2('');
  }

  const tabs = [
    ...(!guest ? [{
      id: 'general' as TabType,
      name: 'General',
      icon: (
        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
        </svg>
      )
    }] : []),
    {
      id: 'account' as TabType,
      name: 'Account',
      icon: (
        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4' />
        </svg>
      )
    },
    ...(!guest ? [{
      id: 'security' as TabType,
      name: 'Security',
      icon: (
        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
        </svg>
      )
    }] : []),
    {
      id: 'notifications' as TabType,
      name: 'Notifications',
      icon: (
        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 17h5l-5 5-5-5h5V12h-5l5-5 5 5h-5v5zM9 12H4l5-5 5 5H9v5h5l-5 5-5-5h5v-5z' />
        </svg>
      )
    },
    {
      id: 'danger' as TabType,
      name: 'Danger Zone',
      icon: (
        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.854-.833-2.624 0L3.228 16.5c-.77.833.192 2.5 1.732 2.5z' />
        </svg>
      )
    }
  ];

  return (
    <Page title='Settings'>
      <div className='flex justify-center w-full px-4 py-8'>
        <div className='w-full max-w-4xl'>
          {/* Header */}
          <div className='text-center mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>Settings</h1>
            <p className='text-gray-600 dark:text-gray-400'>Manage your account and preferences</p>
          </div>
          {/* Tabs */}
          <div className='border-b border-gray-200 dark:border-gray-700 mb-8'>
            <nav className='flex space-x-8' aria-label='Tabs'>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <span className={`mr-2 ${activeTab === tab.id ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-500'}`}>
                    {tab.icon}
                  </span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
          {/* Tab Content */}
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8'>
            {activeTab === 'general' && (
              <div className='flex justify-center'>
                <SettingsGeneral user={user} />
              </div>
            )}
            {activeTab === 'account' && (
              <div>
                {guest ? (
                  <div className='flex justify-center'>
                    <SettingsAccountGuest />
                  </div>
                ) : (
                  <SettingsAccount user={user} />
                )}
              </div>
            )}
            {activeTab === 'security' && !guest && (
              <div>
                <div className='flex items-center mb-6'>
                  <div className='w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mr-3'>
                    <svg className='w-5 h-5 text-red-600 dark:text-red-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
                    </svg>
                  </div>
                  <div>
                    <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Security</h2>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>Update your password to keep your account secure</p>
                  </div>
                </div>
                <form className='space-y-4 max-w-md' onSubmit={updatePassword}>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2' htmlFor='currentPassword'>
                      Current Password
                    </label>
                    <input
                      onChange={e => setCurrentPassword(e.target.value)}
                      className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors'
                      id='currentPassword'
                      value={currentPassword}
                      type='password'
                      placeholder='Enter current password'
                      required
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      New Password
                    </label>
                    <input
                      onChange={e => setPassword(e.target.value)}
                      className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors'
                      type='password'
                      value={password}
                      placeholder='Enter new password'
                      required
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      Confirm New Password
                    </label>
                    <input
                      onChange={e => setPassword2(e.target.value)}
                      className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors'
                      type='password'
                      value={password2}
                      placeholder='Re-enter new password'
                      required
                    />
                  </div>
                  <button
                    className='w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
                    type='submit'
                  >
                    Update Password
                  </button>
                </form>
              </div>
            )}
            {activeTab === 'notifications' && (
              <div className='flex justify-center'>
                <SettingsNotifications />
              </div>
            )}
            {activeTab === 'danger' && (
              <div>
                <div className='flex items-center mb-6'>
                  <div className='w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mr-3'>
                    <svg className='w-5 h-5 text-red-600 dark:text-red-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.854-.833-2.624 0L3.228 16.5c-.77.833.192 2.5 1.732 2.5z' />
                    </svg>
                  </div>
                  <div>
                    <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Danger Zone</h2>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>Irreversible and destructive actions</p>
                  </div>
                </div>
                <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6'>
                  <div className='flex justify-center'>
                    <SettingsDelete />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
