import User from '@root/models/db/user';
import React from 'react';

interface UserPropertiesViewerProps {
  user: User;
  formatDate: (date: string | number) => string;
  getTimeAgo: (timestamp: number) => string;
}

export default function UserPropertiesViewer({ user, formatDate, getTimeAgo }: UserPropertiesViewerProps) {
  if (!user) return null;

  return (
    <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
      <h3 className='font-semibold text-gray-800 dark:text-gray-200 mb-3'>User Information</h3>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='space-y-3'>
          <div>
            <label className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Basic Info</label>
            <div className='mt-1 space-y-2'>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>ID:</span>
                <span className='text-sm text-gray-900 dark:text-gray-100 font-mono'>{user._id.toString()}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>Name:</span>
                <span className='text-sm text-gray-900 dark:text-gray-100'>{user.name}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>Email:</span>
                <span className='text-sm text-gray-900 dark:text-gray-100'>{user.email}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>Roles:</span>
                <span className='text-sm text-gray-900 dark:text-gray-100'>{user.roles?.join(', ') || 'None'}</span>
              </div>
            </div>
          </div>
          <div>
            <label className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Status</label>
            <div className='mt-1 space-y-2'>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>Email Confirmed:</span>
                <span className={`text-sm ${user.emailConfirmed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {user.emailConfirmed ? 'Yes' : 'No'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>Hide Status:</span>
                <span className='text-sm text-gray-900 dark:text-gray-100'>{user.hideStatus ? 'Yes' : 'No'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>Last Game:</span>
                <span className='text-sm text-gray-900 dark:text-gray-100'>{user.lastGame || 'None'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className='space-y-3'>
          <div>
            <label className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Timestamps</label>
            <div className='mt-1 space-y-2'>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>Created:</span>
                <span className='text-sm text-gray-900 dark:text-gray-100'>{user.ts ? formatDate(user.ts) : 'Unknown'}</span>
              </div>
              {user.last_visited_at && (
                <div className='flex justify-between'>
                  <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>Last Visit:</span>
                  <div className='text-right'>
                    <span className='text-sm text-gray-900 dark:text-gray-100'>{formatDate(user.last_visited_at)}</span>
                    <div className='text-xs text-gray-500 dark:text-gray-400'>({getTimeAgo(user.last_visited_at)})</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Preferences</label>
            <div className='mt-1 space-y-2'>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>Disable Confetti:</span>
                <span className='text-sm text-gray-900 dark:text-gray-100'>{user.disableConfetti ? 'Yes' : 'No'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>Email Digest:</span>
                <span className='text-sm text-gray-900 dark:text-gray-100'>{user.emailDigest ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>
          {user.bio && (
            <div>
              <label className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Bio</label>
              <div className='mt-1'>
                <p className='text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 p-2 rounded border border-gray-300 dark:border-gray-600'>
                  {user.bio}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
