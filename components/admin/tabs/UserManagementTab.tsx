import FormattedUser from '@root/components/formatted/formattedUser';
import MultiSelectUser from '@root/components/page/multiSelectUser';
import User from '@root/models/db/user';
import { Network, User as UserIcon } from 'lucide-react';
import React from 'react';
import CommandButton from '../shared/CommandButton';
import CommandMenu from '../shared/CommandMenu';
import { ConnectedUsersData, IAdminCommand } from '../types';
import ConnectedUsersViewer from '../users/ConnectedUsersViewer';
import UserPropertiesViewer from '../users/UserPropertiesViewer';

interface UserManagementTabProps {
  selectedUser: User | null;
  connectedUsers: ConnectedUsersData | null;
  loadingConnectedUsers: boolean;
  commandsUser: IAdminCommand[];
  selectedUserCommand?: IAdminCommand;
  runningCommand: boolean;
  onUserSelect: (user?: User) => void;
  onCommandSelect: (command: IAdminCommand) => void;
  onRunCommand: () => void;
  switchToUser: (userId: string) => void;
  showIpAddresses: (ips: string[]) => void;
  formatDate: (date: string | number) => string;
  getTimeAgo: (timestamp: number) => string;
}

export default function UserManagementTab({
  selectedUser,
  connectedUsers,
  loadingConnectedUsers,
  commandsUser,
  selectedUserCommand,
  runningCommand,
  onUserSelect,
  onCommandSelect,
  onRunCommand,
  switchToUser,
  showIpAddresses,
  formatDate,
  getTimeAgo
}: UserManagementTabProps) {
  return (
    <div className='space-y-8'>
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
        <div className='flex items-center gap-3 mb-6'>
          <UserIcon className='w-6 h-6 text-blue-500' />
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>User Management</h2>
        </div>
        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Select User</label>
            <MultiSelectUser
              key={selectedUser?._id.toString() || 'no-user'}
              defaultValue={selectedUser}
              onSelect={onUserSelect}
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Choose Action</label>
            <div className='flex gap-2'>
              <CommandMenu
                commands={commandsUser}
                selectedCommand={selectedUserCommand}
                onSelect={onCommandSelect}
              />
              <CommandButton
                command={selectedUserCommand || { label: 'Run', command: '' }}
                isRunning={runningCommand}
                onClick={onRunCommand}
              />
            </div>
          </div>
          {selectedUser && (
            <div className='mt-6 space-y-4'>
              <div className='flex items-center gap-2'>
                <FormattedUser id='admin' user={selectedUser} />
              </div>
              <UserPropertiesViewer
                user={selectedUser}
                formatDate={formatDate}
                getTimeAgo={getTimeAgo}
              />
              
              {loadingConnectedUsers && (
                <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
                  <div className='flex items-center gap-2'>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500' />
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Loading connected users...</span>
                  </div>
                </div>
              )}
              {connectedUsers && connectedUsers.users.length > 0 && !loadingConnectedUsers && (
                <ConnectedUsersViewer
                  data={connectedUsers}
                  selectedUserId={selectedUser._id.toString()}
                  switchToUser={switchToUser}
                  showIpAddresses={showIpAddresses}
                  formatDate={formatDate}
                  getTimeAgo={getTimeAgo}
                />
              )}
              {connectedUsers && connectedUsers.users.length === 0 && !loadingConnectedUsers && (
                <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
                  <div className='flex items-center gap-2'>
                    <Network className='w-5 h-5 text-gray-400' />
                    <span className='text-sm text-gray-600 dark:text-gray-400'>No connected users found via shared IP addresses</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
