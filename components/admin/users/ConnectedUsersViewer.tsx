import { Network, Users } from 'lucide-react';
import React from 'react';
import { ConnectedUsersData } from '../types';

interface ConnectedUsersViewerProps {
  data: ConnectedUsersData;
  selectedUserId?: string;
  switchToUser: (userId: string) => void;
  showIpAddresses: (ips: string[]) => void;
  showEmailDomains: (domains: string[]) => void;
  formatDate: (date: string | number) => string;
  getTimeAgo: (timestamp: number) => string;
}

export default function ConnectedUsersViewer({
  data,
  selectedUserId,
  switchToUser,
  showIpAddresses,
  showEmailDomains,
  formatDate,
  getTimeAgo
}: ConnectedUsersViewerProps) {
  // Filter out the current user from the display
  const otherUsers = data.users.filter(user => user._id !== selectedUserId);

  const totalUsers = data.users.length - 1;
  const currentUserInResults = data.users.some(user => user._id === selectedUserId);

  const handleUserNameRightClick = (e: React.MouseEvent, userId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Get the current origin and construct the admin URL
    const currentUrl = new URL(window.location.href);
    const adminUrl = `${currentUrl.origin}${currentUrl.pathname}?userId=${userId}&tab=users`;

    // Open in new window/tab
    window.open(adminUrl, '_blank');
  };

  return (
    <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
      <div className='flex items-center gap-2 mb-3'>
        <Network className='w-5 h-5 text-blue-500' />
        <h3 className='font-semibold text-gray-800 dark:text-gray-200'>Connected Users via IP</h3>
      </div>
      <div className='mb-4 text-sm text-gray-600 dark:text-gray-400'>
        {currentUserInResults ? (
          <>
            Found {totalUsers} total user(s) (including current user) sharing{' '}
            <button
              onClick={() => showIpAddresses(data.distinctIPs)}
              className='text-blue-600 dark:text-blue-400 hover:underline font-medium'
            >
              {data.numDistinctIPs} IP address(es)
            </button>
            {' '}and{' '}
            <button
              onClick={() => showEmailDomains(data.distinctEmailDomains)}
              className='text-blue-600 dark:text-blue-400 hover:underline font-medium'
            >
              {data.numDistinctEmailDomains} email domain(s)
            </button>
            {otherUsers.length > 0 && (
              <span className='block mt-1'>
                {otherUsers.length} other connected user(s):
              </span>
            )}
          </>
        ) : (
          <>
            Found {totalUsers} connected user(s) sharing{' '}
            <button
              onClick={() => showIpAddresses(data.distinctIPs)}
              className='text-blue-600 dark:text-blue-400 hover:underline font-medium'
            >
              {data.numDistinctIPs} IP address(es)
            </button>
            {' '}and{' '}
            <button
              onClick={() => showEmailDomains(data.distinctEmailDomains)}
              className='text-blue-600 dark:text-blue-400 hover:underline font-medium'
            >
              {data.numDistinctEmailDomains} email domain(s)
            </button>
          </>
        )}
      </div>
      <div className='space-y-2'>
        {otherUsers.map((connectedUser) => (
          <div
            key={connectedUser._id}
            className='p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors'
            onClick={() => switchToUser(connectedUser._id)}
          >
            <div className='flex items-center justify-between mb-2'>
              <div className='flex items-center gap-2'>
                <Users className='w-4 h-4 text-gray-400' />
                <span
                  className='font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                  onContextMenu={(e) => handleUserNameRightClick(e, connectedUser._id)}
                  title='Right-click to open in new window'
                >
                  {connectedUser.name}
                </span>
                {connectedUser.email && (
                  <span className='text-sm text-gray-500 dark:text-gray-400'>({connectedUser.email})</span>
                )}
              </div>
              <div className='flex items-center gap-2'>
                {connectedUser.roles.length > 0 && (
                  <span className='text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded'>
                    {connectedUser.roles.join(', ')}
                  </span>
                )}
                <span className='text-xs text-gray-400'>Click to view</span>
              </div>
            </div>
            {/* Activity Stats */}
            <div className='flex items-center gap-4 mb-2 text-xs text-gray-600 dark:text-gray-400'>
              <div className='flex items-center gap-1'>
                <span className='font-medium'>Levels:</span>
                <span className='bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded'>
                  {connectedUser.publishedLevelsCount}
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <span className='font-medium'>Reviews:</span>
                <span className='bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded'>
                  {connectedUser.reviewsCount}
                </span>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400'>
              <div>
                <span className='font-medium'>Registered:</span>
                {connectedUser.ts ? (
                  <div>
                    <div>{formatDate(connectedUser.ts)}</div>
                    <div className='text-xs text-gray-400'>({getTimeAgo(connectedUser.ts)})</div>
                  </div>
                ) : (
                  <div>Unknown</div>
                )}
              </div>
              <div>
                <span className='font-medium'>Last Visit:</span>
                {connectedUser.last_visited_at ? (
                  <div>
                    <div>{formatDate(connectedUser.last_visited_at)}</div>
                    <div className='text-xs text-gray-400'>({getTimeAgo(connectedUser.last_visited_at)})</div>
                  </div>
                ) : (
                  <div>Never</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
