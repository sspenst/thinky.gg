import { Menu, Transition } from '@headlessui/react';
import LevelCard from '@root/components/cards/levelCard';
import FormattedUser from '@root/components/formatted/formattedUser';
import MultiSelectLevel from '@root/components/page/multiSelectLevel';
import MultiSelectUser from '@root/components/page/multiSelectUser';
import Page from '@root/components/page/page';
import AdminCommand from '@root/constants/adminCommand';
import Role from '@root/constants/role';
import useLevelBySlug from '@root/hooks/useLevelBySlug';
import dbConnect from '@root/lib/dbConnect';
import { getUserFromToken } from '@root/lib/withAuth';
import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import { LevelModel, UserModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Router from 'next/router';
import React, { Fragment, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import TextareaAutosize from 'react-textarea-autosize';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser || !reqUser.roles.includes(Role.ADMIN)) {
    return {
      notFound: true,
    };
  }

  const { queryUser, queryLevel, queryUserCommand, queryLevelCommand } = context.query;

  return {
    props: {
      queryLevel: queryLevel && queryLevel !== 'undefined' ? JSON.parse(JSON.stringify(await LevelModel.findById(new Types.ObjectId(queryLevel as string)))) : null,
      queryUser: queryUser && queryUser !== 'undefiend' ? JSON.parse(JSON.stringify(await UserModel.findOne({ name: queryUser }))) : null,
      queryUserCommand: queryUserCommand || null,
      queryLevelCommand: queryLevelCommand || null,
    },
  };
}

export default function AdminPage({ queryUser, queryLevel, queryUserCommand, queryLevelCommand }: {queryUser: User | undefined; queryLevel: Level, queryUserCommand: string | null, queryLevelCommand: string | null}) {
  const [adminHref, setAdminHref] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [adminMessageRole, setAdminMessageRole] = useState<Role | null>(Role.ADMIN);
  const [runningCommand, setRunningCommand] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(queryLevel); // TODO: [refactor] [minor
  const [selectedUser, setSelectedUser] = useState(queryUser);

  const commandsUser = [
    { label: 'Refresh Achievements', command: AdminCommand.RefreshAchievements },
    { label: 'Delete Achievements', command: AdminCommand.DeleteAchievements, confirm: true },
  ];

  const commandsLevel = [
    { label: 'Refresh Play Attempts', command: AdminCommand.RefreshPlayAttempts },
    { label: 'Refresh Index Calculations', command: AdminCommand.RefreshIndexCalcs },
    { label: 'Switch isRanked', command: AdminCommand.SwitchIsRanked },
    { label: 'Regen image', command: AdminCommand.RegenImage },
  ];
  const selectedUserCommandFromQuery = commandsUser.find((cmd) => cmd.command === queryUserCommand);

  const [selectedUserCommand, setSelectedUserCommand] = useState<{ label: string; command: string; confirm?: boolean } | null>(selectedUserCommandFromQuery || null);

  const selectedLevelCommandFromQuery = commandsLevel.find((cmd) => cmd.command === queryLevelCommand);

  const [selectedLevelCommand, setSelectedLevelCommand] = useState<{ label: string; command: string; confirm?: boolean } | null>(selectedLevelCommandFromQuery || null);

  const { level: levelPreview } = useLevelBySlug(selectedLevel?.slug);

  useEffect(() => {
    const newUrl = `${window.location.pathname}?queryLevel=${selectedLevel?._id}&queryLevelCommand=${selectedLevelCommand?.command}&queryUser=${selectedUser?.name}&queryUserCommand=${selectedUserCommand?.command}`;

    const currentFullURL = `${window.location.pathname}${window.location.search}`;

    if (currentFullURL !== newUrl) {
      Router.push(newUrl);
    }
  }, [selectedUser, selectedUserCommand, selectedLevel?._id, selectedLevelCommand?.command]);

  async function runCommandUser() {
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
        targetId: selectedUser?._id,
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
        targetId: selectedLevel?._id,
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

  async function runCommandAdmin() {
    if (selectedUserCommand?.confirm && !window.confirm('Are you sure you want to proceed?')) return;

    setRunningCommand(true);
    toast.dismiss();
    toast.loading('Running command...');

    const payload = JSON.stringify({
      href: adminHref,
      message: adminMessage,
    });

    const resp = await fetch('/api/admin', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: AdminCommand.SendAdminMessage,
        role: adminMessageRole,
        payload: payload,
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
          <MultiSelectUser key={'search-' + selectedUser?._id} defaultValue={selectedUser} onSelect={(selected: User) => {
            setSelectedUser(selected);
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
              {selectedUser && (
                <div className='flex flex-col gap-2'>
                  {display('User', selectedUser)}
                </div>
              )}
            </div>
          </div>
        }
        <h2 className='flex flex-col items-center justify-center text-2xl font-medium'>
          Level
        </h2>
        <div className='flex flex-row items-center justify-center p-2 gap-2'>
          <p className='text-xl'>Run command on level:</p>
          <MultiSelectLevel key={'search-' + selectedLevel?._id} defaultValue={selectedLevel} onSelect={(selected: Level) => {
            setSelectedLevel(selected);
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
        <div className='p-4'>
          <LevelCard id='admin' level={levelPreview} />
        </div>
        <div className='flex flex-row items-center justify-center gap-2'>
          {selectedLevel && (
            <div className='flex flex-col gap-2'>
              {display('Level', selectedLevel)}
            </div>
          )}
        </div>
        <h2 className='text-2xl font-medium'>
            Send Admin Message
        </h2>
        <TextareaAutosize
          className='bg-inherit block py-1 -mt-2 w-96 max-w-full border-b border-neutral-500 disabled:text-neutral-500 transition resize-none placeholder:text-neutral-500 focus:outline-0 rounded-none focus:border-black focus:dark:border-white'
          onChange={(e) => setAdminMessage(e.currentTarget.value)}
          placeholder='Admin message...'
          value={adminMessage}
        />
        <TextareaAutosize
          className='bg-inherit block py-1 -mt-2 w-96 max-w-full border-b border-neutral-500 disabled:text-neutral-500 transition resize-none placeholder:text-neutral-500 focus:outline-0 rounded-none focus:border-black focus:dark:border-white'
          onChange={(e) => setAdminHref(e.currentTarget.value)}
          placeholder='Href (eg: "/settings/pro")...'
          value={adminHref}
        />
        <div className='flex gap-2 items-center'>
          <span>To:</span>
          <Menu as='div' className='relative inline-block text-left'>
            <Menu.Button
              aria-expanded='true'
              aria-haspopup='true'
              className='flex items-center w-full justify-center rounded-md bg-white pl-2 p-1 text-sm font-medium text-black gap-1 h-8 shadow-md border hover:opacity-70'
              id='menu-button'
              style={{
                borderColor: 'var(--bg-color-3)',
              }}
            >
              {adminMessageRole ?? 'All'}
              <svg className='h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
                <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
              </svg>
            </Menu.Button>
            <Transition
              as={Fragment}
              enter='transition ease-out duration-100'
              enterFrom='transform opacity-0 scale-95'
              enterTo='transform opacity-100 scale-100'
              leave='transition ease-in duration-75'
              leaveFrom='transform opacity-100 scale-100'
              leaveTo='transform opacity-0 scale-95'
            >
              <Menu.Items className='absolute right-0 z-10 mt-1 rounded-md overflow-hidden border bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border-color-1'>
                <div>
                  {Object.values(Role).map(role => (
                    <Menu.Item key={`role-${role}`}>
                      {({ active }) => (
                        <button
                          className='text-black block p-1 text-sm w-28 flex items-center gap-1 justify-center'
                          onClick={() => setAdminMessageRole(role)}
                          role='menuitem'
                          style= {{
                            backgroundColor: active ? 'rgb(200, 200, 200)' : '',
                          }}
                        >
                          {role}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                  <Menu.Item key='role-all'>
                    {({ active }) => (
                      <button
                        className='text-black block p-1 text-sm w-28 flex items-center gap-1 justify-center'
                        onClick={() => setAdminMessageRole(null)}
                        role='menuitem'
                        style= {{
                          backgroundColor: active ? 'rgb(200, 200, 200)' : '',
                        }}
                      >
                        All
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
        <button
          className={`bg-blue-500 hover:enabled:bg-blue-700 text-white font-bold py-2 px-4 rounded ${runningCommand ? 'bg-gray-500 cursor-not-allowed' : ''}`}
          disabled={runningCommand}
          onClick={runCommandAdmin}
        >
          Run
        </button>
      </div>
    </Page>
  );
}
