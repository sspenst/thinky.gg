import { Menu } from '@headlessui/react';
import SendAdminMessage from '@root/components/admin/sendAdminMessage';
import LevelCard from '@root/components/cards/levelCard';
import FormattedUser from '@root/components/formatted/formattedUser';
import MultiSelectLevel from '@root/components/page/multiSelectLevel';
import MultiSelectUser from '@root/components/page/multiSelectUser';
import Page from '@root/components/page/page';
import AdminCommand from '@root/constants/adminCommand';
import Role from '@root/constants/role';
import useRouterQuery from '@root/hooks/useRouterQuery';
import dbConnect from '@root/lib/dbConnect';
import { getUserFromToken } from '@root/lib/withAuth';
import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import { LevelModel, UserModel } from '@root/models/mongoose';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Router from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface AdminQuery extends ParsedUrlQuery {
  levelId?: string;
  userId?: string;
}

const DefaultQuery: AdminQuery = {
  levelId: undefined,
  userId: undefined,
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
  ]))[0] : null;
  const user = adminQuery.userId ? await UserModel.findById(new Types.ObjectId(adminQuery.userId)) : null;

  return {
    props: {
      adminQuery: JSON.parse(JSON.stringify(adminQuery)),
      level: JSON.parse(JSON.stringify(level)),
      user: JSON.parse(JSON.stringify(user)),
    },
  };
}

export interface IAdminCommand {
  command: string;
  confirm?: boolean;
  label: string;
}

interface AdminPageProps {
  adminQuery: AdminQuery;
  level: Level | null;
  user: User | null;
}

/* istanbul ignore next */
export default function AdminPage({ adminQuery, level, user }: AdminPageProps) {
  const routerQuery = useRouterQuery();
  const [runningCommand, setRunningCommand] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(level);
  const [selectedUser, setSelectedUser] = useState(user);

  useEffect(() => {
    setSelectedLevel(level);
  }, [level]);

  useEffect(() => {
    setSelectedUser(user);
  }, [user]);

  const commandsUser: IAdminCommand[] = [
    { label: 'Refresh Achievements', command: AdminCommand.RefreshAchievements },
    { label: 'Delete Achievements', command: AdminCommand.DeleteAchievements, confirm: true },
  ];

  const commandsLevel: IAdminCommand[] = [
    { label: 'Refresh Play Attempts', command: AdminCommand.RefreshPlayAttempts },
    { label: 'Refresh Index Calculations', command: AdminCommand.RefreshIndexCalcs },
    { label: 'Switch isRanked', command: AdminCommand.SwitchIsRanked },
    { label: 'Regen image', command: AdminCommand.RegenImage },
  ];

  const [selectedLevelCommand, setSelectedLevelCommand] = useState<IAdminCommand>();
  const [selectedUserCommand, setSelectedUserCommand] = useState<IAdminCommand>();

  const updateQuery = useCallback((update: Partial<AdminQuery>) => {
    routerQuery({ ...adminQuery, ...update }, DefaultQuery);
  }, [adminQuery, routerQuery]);

  async function runCommandUser() {
    if (!selectedUser) {
      return;
    }

    if (selectedUserCommand?.confirm && !window.confirm('Are you sure you want to proceed?')) return;

    setRunningCommand(true);
    toast.dismiss();
    toast.loading('Running command...');
    const resp = await fetch('/api/admin', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: selectedUserCommand?.command,
        targetId: selectedUser._id,
      }),
    });

    setRunningCommand(false);
    const json = await resp.json();

    toast.dismiss();

    if (json.error) {
      toast.error(json.error);
    } else {
      toast.success('Command ran successfully');
    }
  }

  async function runCommandLevel() {
    if (!selectedLevel) {
      return;
    }

    if (selectedLevelCommand?.confirm && !window.confirm('Are you sure you want to proceed?')) return;

    setRunningCommand(true);
    toast.dismiss();
    toast.loading('Running command...');
    const resp = await fetch('/api/admin', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: selectedLevelCommand?.command,
        targetId: selectedLevel._id,
      }),
    });

    setRunningCommand(false);
    const json = await resp.json();

    toast.dismiss();

    if (json.error) {
      toast.error(json.error);
    } else {
      toast.success('Command ran successfully');
    }

    Router.reload();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function display(title: string, obj: any) {
    return (
      <div>
        <h1 className='text-2xl font-bold mb-4'>{title}</h1>
        {obj && (
          <div className='grid grid-cols-4 gap-4'>
            {Object.keys(obj).map((value) => {
              const key = value;
              const str = obj[key]?.toString() ?? '';

              return (
                <div key={key} className='flex items-center'>
                  <div className='flex-none font-bold pr-2'>
                    <label>{key}:</label>
                  </div>
                  <div className='flex-grow'>
                    <input
                      type='text'
                      readOnly
                      value={str}
                      onClick={(e) => {
                        (e.target as HTMLInputElement).select();
                        navigator.clipboard.writeText(str);
                      }}
                      className='p-1 rounded-md w-full'
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Page title='Admin Page'>
      <div className='flex flex-col items-center gap-3 p-2'>
        <h1 className='flex flex-col items-center justify-center text-3xl font-semibold p-3'>
          Admin Page
        </h1>
        <h2 className='flex flex-col items-center justify-center text-2xl font-medium'>
          User
        </h2>
        <div className='flex flex-row items-center justify-center p-2 gap-2'>
          <p className='text-xl'>Run command on user:</p>
          <MultiSelectUser defaultValue={selectedUser} onSelect={(selected?: User) => {
            updateQuery({ userId: !selected ? undefined : selected._id.toString() });
          }} />
          <Menu as='div' className='relative inline-block text-left'>
            <div>
              <Menu.Button className='border border-gray-300 bg-gray rounded-md shadow-sm px-4 py-2 text-sm flex flex-row items-center justify-center gap-2'>
                {selectedUserCommand?.label || 'Select Command'}
              </Menu.Button>
            </div>
            <Menu.Items className='origin-top-right absolute right-0 mt-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10'>
              {commandsUser.map((cmd) => (
                <Menu.Item key={cmd.command}>
                  {({ active }) => (
                    <button
                      className={`${active ? 'bg-blue-600 text-white rounded-md' : 'text-gray-900'} block px-4 py-2 text-sm w-full`}
                      onClick={() => setSelectedUserCommand(cmd)}
                    >
                      {cmd.label}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </Menu.Items>
          </Menu>
          <button
            className={`bg-blue-500 hover:enabled:bg-blue-700 text-white font-bold py-2 px-4 rounded ${runningCommand ? 'bg-gray-500 cursor-not-allowed' : ''}`}
            disabled={runningCommand}
            onClick={runCommandUser}
          >
            Run
          </button>
        </div>
        {selectedUser &&
          <div className='flex flex-col items-center justify-center p-2 gap-2'>
            <FormattedUser id='admin' user={selectedUser} />
            <div className='flex flex-row items-center justify-center p-2 gap-2'>
              <div className='flex flex-col gap-2'>
                {display('User', selectedUser)}
              </div>
            </div>
          </div>
        }
        <h2 className='flex flex-col items-center justify-center text-2xl font-medium'>
          Level
        </h2>
        <div className='flex flex-row items-center justify-center p-2 gap-2'>
          <p className='text-xl'>Run command on level:</p>
          <MultiSelectLevel defaultValue={selectedLevel} onSelect={(selected?: Level) => {
            updateQuery({ levelId: !selected ? undefined : selected._id.toString() });
          }} />
          <Menu as='div' className='relative inline-block text-left'>
            <div>
              <Menu.Button className='border border-gray-300 bg-gray rounded-md shadow-sm px-4 py-2 text-sm flex flex-row items-center justify-center gap-2'>
                {selectedLevelCommand?.label || 'Select Command'}
              </Menu.Button>
            </div>
            <Menu.Items className='origin-top-right absolute right-0 mt-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10'>
              {commandsLevel.map((cmd) => (
                <Menu.Item key={cmd.command}>
                  {({ active }) => (
                    <button
                      className={`${active ? 'bg-blue-600 text-white rounded-md' : 'text-gray-900'} block px-4 py-2 text-sm w-full`}
                      onClick={() => setSelectedLevelCommand(cmd)}
                    >
                      {cmd.label}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </Menu.Items>
          </Menu>
          <button
            className={`bg-blue-500 hover:enabled:bg-blue-700 text-white font-bold py-2 px-4 rounded ${runningCommand ? 'bg-gray-500 cursor-not-allowed' : ''}`}
            disabled={runningCommand}
            onClick={runCommandLevel}
          >
            Run
          </button>
        </div>
        {selectedLevel && <div className='p-4'>
          <LevelCard id='admin' level={selectedLevel} />
        </div>}
        <div className='flex flex-row items-center justify-center gap-2'>
          {selectedLevel && (
            <div className='flex flex-col gap-2'>
              {display('Level', selectedLevel)}
            </div>
          )}
        </div>
      </div>
      <div className='flex flex-col items-center justify-center'>
        <SendAdminMessage selectedUserCommand={selectedUserCommand} setRunningCommand={setRunningCommand} runningCommand={runningCommand} />
      </div>
    </Page>
  );
}
