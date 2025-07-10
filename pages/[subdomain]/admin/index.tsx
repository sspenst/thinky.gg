import LevelManagementTab from '@root/components/admin/tabs/LevelManagementTab';
import SystemOperationsTab from '@root/components/admin/tabs/SystemOperationsTab';
import SystemVariablesTab from '@root/components/admin/tabs/SystemVariablesTab';
import UserManagementTab from '@root/components/admin/tabs/UserManagementTab';
import { AdminPageProps, AdminQuery, ConnectedUsersData, IAdminCommand, Tab } from '@root/components/admin/types';
import Page from '@root/components/page/page';
import AdminCommand from '@root/constants/adminCommand';
import Role from '@root/constants/role';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { useAdminCommands } from '@root/hooks/useAdminCommands';
import useRouterQuery from '@root/hooks/useRouterQuery';
import { useSystemVariables } from '@root/hooks/useSystemVariables';
import dbConnect from '@root/lib/dbConnect';
import { getUserFromToken } from '@root/lib/withAuth';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import { LevelModel, UserModel } from '@root/models/mongoose';
import { Box, Database, Settings, Trash2, User as UserIcon } from 'lucide-react';
import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const DefaultQuery: AdminQuery = {
  levelId: undefined,
  userId: undefined,
  tab: 'users',
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser || !reqUser.roles.includes(Role.ADMIN)) {
    return {
      notFound: true,
    };
  }

  const adminQuery: AdminQuery = { ...DefaultQuery };

  if (context.query && (Object.keys(context.query).length > 0)) {
    for (const q in context.query as AdminQuery) {
      adminQuery[q] = context.query[q];
    }
  }

  const level = adminQuery.levelId ? (await LevelModel.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(adminQuery.levelId),
      },
    },
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: 'userId',
        foreignField: '_id',
        as: 'userId',
        pipeline: [
          {
            $project: {
              ...USER_DEFAULT_PROJECTION,
            }
          }
        ]
      }
    },
    {
      $unwind: {
        path: '$userId',
        preserveNullAndEmptyArrays: true,
      },
    },
    ...getEnrichUserConfigPipelineStage('$gameId', { excludeCalcs: true, localField: 'userId._id', lookupAs: 'userId.config' }),
  ]))[0] : null;
  const user = adminQuery.userId ? await UserModel.findById(new Types.ObjectId(adminQuery.userId)).select('+emailConfirmed +email +bio') : null;

  return {
    props: {
      adminQuery: JSON.parse(JSON.stringify(adminQuery)),
      level: JSON.parse(JSON.stringify(level)),
      user: JSON.parse(JSON.stringify(user)),
    },
  };
}

export default function AdminPage({ adminQuery, level, user }: AdminPageProps) {
  const routerQuery = useRouterQuery();
  const [selectedLevel, setSelectedLevel] = useState(level);
  const [selectedUser, setSelectedUser] = useState(user);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUsersData | null>(null);
  const [loadingConnectedUsers, setLoadingConnectedUsers] = useState(false);
  const [showIpModal, setShowIpModal] = useState(false);
  const [showEmailDomainModal, setShowEmailDomainModal] = useState(false);
  const [ipList, setIpList] = useState<string[]>([]);
  const [emailDomainList, setEmailDomainList] = useState<string[]>([]);

  const systemVariables = useSystemVariables();
  const adminCommands = useAdminCommands();

  const activeTab = (adminQuery.tab as Tab) || 'users';

  // Command definitions
  const commandsUser: IAdminCommand[] = [
    {
      label: 'Refresh Achievements',
      command: AdminCommand.RefreshAchievements,
      icon: Settings
    },
    {
      label: 'Delete Achievements',
      command: AdminCommand.DeleteAchievements,
      confirm: true,
      icon: Trash2,
      dangerous: true
    },
    {
      label: 'Delete User',
      command: AdminCommand.DeleteUser,
      confirm: true,
      icon: Trash2,
      dangerous: true
    },
  ];

  const commandsLevel: IAdminCommand[] = [
    {
      label: 'Refresh Play Attempts',
      command: AdminCommand.RefreshPlayAttempts,
      icon: Settings
    },
    {
      label: 'Refresh Index Calculations',
      command: AdminCommand.RefreshIndexCalcs,
      icon: Settings
    },
    {
      label: 'Switch isRanked',
      command: AdminCommand.SwitchIsRanked,
      icon: Settings
    },
    {
      label: 'Regen image',
      command: AdminCommand.RegenImage,
      icon: Settings
    },
  ];

  const commandsGeneral: IAdminCommand[] = [
    {
      label: 'Force Reload Page to Everyone',
      command: AdminCommand.SendReloadPageToUsers,
      icon: Settings
    },
    {
      label: 'Refresh Level Playattempt Calcs (spread over 1 hr)',
      command: AdminCommand.RunBatchRefreshPlayAttempts,
      icon: Settings
    },
  ];

  const updateQuery = useCallback((update: Partial<AdminQuery>) => {
    routerQuery({ ...adminQuery, ...update }, DefaultQuery);
  }, [adminQuery, routerQuery]);

  const switchTab = (tab: Tab) => {
    updateQuery({ tab });
  };

  const switchToUser = (userId: string) => {
    updateQuery({ userId, tab: 'users' });
  };

  const showIpAddresses = (ips: string[]) => {
    setIpList(ips);
    setShowIpModal(true);
  };

  const showEmailDomains = (domains: string[]) => {
    setEmailDomainList(domains);
    setShowEmailDomainModal(true);
  };

  const fetchConnectedUsers = async (userId: string) => {
    setLoadingConnectedUsers(true);

    try {
      const response = await fetch('/api/admin/connected-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();

        setConnectedUsers(data);
      } else {
        console.error('Failed to fetch connected users');
        setConnectedUsers(null);
      }
    } catch (error) {
      console.error('Error fetching connected users:', error);
      setConnectedUsers(null);
    } finally {
      setLoadingConnectedUsers(false);
    }
  };

  const formatDate = (date: string | number) => {
    // ts is stored in seconds, but Date expects milliseconds
    const timestamp = typeof date === 'number' ? date * 1000 : date;

    return new Date(timestamp).toLocaleString();
  };

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - (timestamp * 1000); // Convert to milliseconds

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} year${years !== 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months !== 1 ? 's' : ''} ago`;
    if (weeks > 0) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  };

  // Effects
  useEffect(() => {
    setSelectedLevel(level);
  }, [level]);

  useEffect(() => {
    setSelectedUser(user);

    if (user) {
      fetchConnectedUsers(user._id.toString());
    } else {
      setConnectedUsers(null);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'config') {
      systemVariables.fetchSystemVariables();
    }
  }, [activeTab, systemVariables.fetchSystemVariables]);

  // Command handlers
  const handleUserCommand = async () => {
    const userDeleted = await adminCommands.runCommandUser(selectedUser);

    if (userDeleted) {
      setSelectedUser(null);
      updateQuery({ userId: undefined });
    }
  };

  const handleLevelCommand = async () => {
    await adminCommands.runCommandLevel(selectedLevel);
  };

  const handleGenericCommand = async () => {
    await adminCommands.runCommandGeneric();
  };

  const tabs = [
    { id: 'users' as Tab, name: 'User Management', icon: UserIcon },
    { id: 'levels' as Tab, name: 'Level Management', icon: Box },
    { id: 'system' as Tab, name: 'System Operations', icon: Settings },
    { id: 'config' as Tab, name: 'System Variables', icon: Database },
  ];

  return (
    <Page title='Admin Dashboard'>
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Admin Dashboard</h1>
          <p className='text-gray-600 dark:text-gray-400 mt-2'>Manage users, levels, and system operations</p>
        </div>
        {/* IP Address Modal */}
        {showIpModal && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>IP Addresses</h3>
                <button
                  onClick={() => setShowIpModal(false)}
                  className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                >
                  <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
              </div>
              <div className='mb-4'>
                <textarea
                  className='w-full h-40 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
                  value={ipList.join('\n')}
                  readOnly
                  onClick={(e) => {
                    (e.target as HTMLTextAreaElement).select();
                    navigator.clipboard.writeText(ipList.join('\n'));
                    toast.success('All IP addresses copied to clipboard');
                  }}
                  placeholder='No IP addresses found'
                />
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>Click the textarea to select all and copy to clipboard</p>
              </div>
              <button
                onClick={() => setShowIpModal(false)}
                className='w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors'
              >
                Close
              </button>
            </div>
          </div>
        )}
        {/* Email Domain Modal */}
        {showEmailDomainModal && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Email Domains</h3>
                <button
                  onClick={() => setShowEmailDomainModal(false)}
                  className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                >
                  <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
              </div>
              <div className='mb-4'>
                <textarea
                  className='w-full h-40 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
                  value={emailDomainList.join('\n')}
                  readOnly
                  onClick={(e) => {
                    (e.target as HTMLTextAreaElement).select();
                    navigator.clipboard.writeText(emailDomainList.join('\n'));
                    toast.success('All email domains copied to clipboard');
                  }}
                  placeholder='No email domains found'
                />
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>Click the textarea to select all and copy to clipboard</p>
              </div>
              <button
                onClick={() => setShowEmailDomainModal(false)}
                className='w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors'
              >
                Close
              </button>
            </div>
          </div>
        )}
        {/* Tab Navigation */}
        <div className='border-b border-gray-200 dark:border-gray-700 mb-8'>
          <nav className='-mb-px flex space-x-8'>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors
                    ${isActive
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }
                  `}
                >
                  <Icon className='w-5 h-5' />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
        {/* Tab Content */}
        {activeTab === 'users' && (
          <UserManagementTab
            selectedUser={selectedUser}
            connectedUsers={connectedUsers}
            loadingConnectedUsers={loadingConnectedUsers}
            commandsUser={commandsUser}
            selectedUserCommand={adminCommands.selectedUserCommand}
            runningCommand={adminCommands.runningCommand}
            onUserSelect={(user?: User) => {
              updateQuery({ userId: !user ? undefined : user._id.toString() });
            }}
            onCommandSelect={adminCommands.setSelectedUserCommand}
            onRunCommand={handleUserCommand}
            switchToUser={switchToUser}
            showIpAddresses={showIpAddresses}
            showEmailDomains={showEmailDomains}
            formatDate={formatDate}
            getTimeAgo={getTimeAgo}
          />
        )}
        {activeTab === 'levels' && (
          <LevelManagementTab
            selectedLevel={selectedLevel}
            commandsLevel={commandsLevel}
            selectedLevelCommand={adminCommands.selectedLevelCommand}
            runningCommand={adminCommands.runningCommand}
            onLevelSelect={(level?: Level) => {
              updateQuery({ levelId: !level ? undefined : level._id.toString() });
            }}
            onCommandSelect={adminCommands.setSelectedLevelCommand}
            onRunCommand={handleLevelCommand}
          />
        )}
        {activeTab === 'system' && (
          <SystemOperationsTab
            commandsGeneral={commandsGeneral}
            selectedGenericCommand={adminCommands.selectedGenericCommand}
            selectedUserCommand={adminCommands.selectedUserCommand}
            runningCommand={adminCommands.runningCommand}
            onCommandSelect={adminCommands.setSelectedGenericCommand}
            onRunCommand={handleGenericCommand}
            setRunningCommand={adminCommands.setRunningCommand}
          />
        )}
        {activeTab === 'config' && (
          <SystemVariablesTab
            systemVariables={systemVariables.systemVariables}
            loadingVariables={systemVariables.loadingVariables}
            searchTerm={systemVariables.searchTerm}
            editingVariable={systemVariables.editingVariable}
            showNewForm={systemVariables.showNewForm}
            newVariable={systemVariables.newVariable}
            onSearchChange={systemVariables.setSearchTerm}
            onShowNewForm={systemVariables.handleShowNewForm}
            onNewVariableChange={systemVariables.setNewVariable}
            onCreateVariable={systemVariables.createSystemVariable}
            onUpdateVariable={systemVariables.updateSystemVariable}
            onDeleteVariable={systemVariables.deleteSystemVariable}
            onEditVariable={systemVariables.setEditingVariable}
            onCancelEdit={() => systemVariables.setEditingVariable(null)}
            formatDate={formatDate}
            getTimeAgo={getTimeAgo}
          />
        )}
      </div>
    </Page>
  );
}
