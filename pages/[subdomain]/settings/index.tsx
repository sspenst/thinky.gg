import SettingsAccount from '@root/components/settings/settingsAccount';
import SettingsAccountGuest from '@root/components/settings/settingsAccountGuest';
import SettingsConnections from '@root/components/settings/settingsConnections';
import SettingsDelete from '@root/components/settings/settingsDelete';
import SettingsNotifications from '@root/components/settings/settingsNotifications';
import isGuest from '@root/helpers/isGuest';
import User from '@root/models/db/user';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { useEffect, useState } from 'react';
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

type TabType = 'general' | 'account' | 'connections' | 'notifications' | 'danger';

/* istanbul ignore next */
export default function Settings({ user }: SettingsProps) {
  const guest = isGuest(user);

  const [activeTab, setActiveTab] = useState<TabType>(guest ? 'account' : 'general');

  // Handle URL hash for direct tab linking
  useEffect(() => {
    const hash = window.location.hash.substring(1) as TabType;
    const validTabs = guest
      ? ['account', 'connections', 'notifications', 'danger']
      : ['general', 'account', 'connections', 'notifications', 'danger'];

    if (hash && validTabs.includes(hash)) {
      setActiveTab(hash);
    }
  }, [guest]);

  // Update URL hash when tab changes
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    window.history.pushState(null, '', `#${tabId}`);
  };

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
    // Only show connections tab if OAuth is enabled
    {
      id: 'connections' as TabType,
      name: 'Connections',
      icon: (
        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' />
        </svg>
      )
    },
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
            <nav className='flex flex-wrap gap-x-2 gap-y-1 sm:gap-x-8 sm:gap-y-0' aria-label='Tabs'>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`group inline-flex items-center py-4 px-2 sm:px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <span className={`mr-2 ${activeTab === tab.id ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-500'}`}>
                    {tab.icon}
                  </span>
                  <span className='hidden sm:inline'>{tab.name}</span>
                  <span className='sm:hidden'>{tab.name.split(' ')[0]}</span>
                </button>
              ))}
            </nav>
          </div>
          {/* Tab Content */}
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-8 overflow-hidden'>
            {activeTab === 'general' && (
              <div className='flex justify-center'>
                <SettingsGeneral user={user} />
              </div>
            )}
            {activeTab === 'account' && (
              <div className='min-w-0'>
                {guest ? (
                  <div className='flex justify-center'>
                    <SettingsAccountGuest />
                  </div>
                ) : (
                  <SettingsAccount user={user} />
                )}
              </div>
            )}
            {activeTab === 'connections' && !guest && (
              <div className='min-w-0'>
                <SettingsConnections user={user} />
              </div>
            )}
            {activeTab === 'notifications' && (
              <div className='flex justify-center'>
                <SettingsNotifications />
              </div>
            )}
            {activeTab === 'danger' && (
              <div className='min-w-0'>
                <div className='flex items-center mb-6'>
                  <div className='w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mr-3'>
                    <svg className='w-5 h-5 text-red-600 dark:text-red-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.854-.833-2.624 0L3.228 16.5c-.77.833.192 2.5 1.732 2.5z' />
                    </svg>
                  </div>
                  <div className='min-w-0 flex-1'>
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
