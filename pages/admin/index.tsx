import { Menu } from '@headlessui/react';
import FormattedUser from '@root/components/formatted/formattedUser';
import MultiSelectUser from '@root/components/page/multiSelectUser';
import Page from '@root/components/page/page';
import Role from '@root/constants/role';
import useSWRHelper from '@root/hooks/useSWRHelper';
import dbConnect from '@root/lib/dbConnect';
import { getUserFromToken } from '@root/lib/withAuth';
import User from '@root/models/db/user';
import { UserModel } from '@root/models/mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Router from 'next/router';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser || !reqUser.roles.includes(Role.ADMIN)) {
    return {
      notFound: true,
    };
  }

  const { queryUser, queryCommand } = context.query;

  return {
    props: {
      queryUser: queryUser ? JSON.parse(JSON.stringify(await UserModel.findOne({ name: queryUser }))) : null,
      queryCommand: queryCommand || null,
    },
  };
}

export default function AdminPage({ queryUser, queryCommand }: {queryUser: User | undefined; queryCommand: string | null}) {
  const [selectedUser, setSelectedUser] = useState<any>(queryUser as User);
  const [runningCommand, setRunningCommand] = useState(false);

  const commands = [
    { label: 'Refresh Achievements', command: 'refreshAchievements' },
    { label: 'Delete Achievements', command: 'deleteAchievements', confirm: true },
    { label: 'Refresh Play Attempts', command: 'calcPlayAttempts' },
    { label: 'Refresh Index Calculations', command: 'refreshIndexCalcs' },

    // Add more commands here
  ];
  const selectedCommandFromQuery = commands.find((cmd) => cmd.command === queryCommand);

  const [selectedCommand, setSelectedCommand] = useState<{ label: string; command: string; confirm?: boolean } | null>(selectedCommandFromQuery || null);

  useEffect(() => {
    if (queryUser && queryUser !== selectedUser) {
      setSelectedUser(queryUser);
    }

    if (queryCommand && queryCommand !== selectedCommand?.command) {
      if (selectedCommandFromQuery) {
        setSelectedCommand(selectedCommandFromQuery);
      }
    }
  }, [queryCommand, queryUser, selectedCommand?.command, selectedCommandFromQuery, selectedUser]);

  useEffect(() => {
    const newUrl = `${window.location.pathname}?queryUser=${selectedUser?.name}&queryCommand=${selectedCommand?.command}`;

    const currentFullURL = `${window.location.pathname}${window.location.search}`;

    if (currentFullURL !== newUrl) {
      Router.push(newUrl);
    }
  }, [selectedUser, selectedCommand]);

  async function runCommand() {
    if (selectedCommand?.confirm && !window.confirm('Are you sure you want to proceed?')) return;

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
        command: selectedCommand?.command,
        targetId: selectedUser?._id,
      }),
    });

    setRunningCommand(false);
    const json = await resp.json();

    if (json.error) {
      toast.error(json.error);
    } else {
      toast.success('Command ran successfully');
    }
  }

  function display(title: string, obj: any) {
    return (
      <div>
        <h1 className='text-2xl font-bold mb-4'>{title}</h1>
        {obj && (
          <div className='grid grid-cols-4 gap-4'>
            {Object.keys(obj).map((key, index) => (
              <div key={key} className='flex items-center'>
                <div className='flex-none font-bold pr-2'>
                  <label>{key}:</label>
                </div>
                <div className='flex-grow'>
                  <input
                    type='text'
                    readOnly
                    value={obj[key]}
                    onClick={(e) => {
                      (e.target as HTMLInputElement).select();
                      navigator.clipboard.writeText(obj[key]);
                    }}
                    className='text-black p-1 rounded-md w-full'
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Page title='Admin Page'>
      <div className='p-2'>
        <h1 className='flex flex-col items-center justify-center text-2xl'>Admin Page</h1>
        <div className='flex flex-col items-center justify-center p-2 gap-2'>
          <p className='text-xl'>Run command on user:</p>
          <MultiSelectUser key={'search-' + selectedUser?._id} defaultValue={selectedUser} onSelect={(selected: User) => {
            setSelectedUser(selected);
          }
          } />
          <Menu as='div' className='relative inline-block text-left'>
            <div>
              <Menu.Button className='border border-gray-300 bg-gray rounded-md shadow-sm px-4 py-2 text-sm flex flex-row items-center justify-center gap-2'>
                {selectedCommand?.label || 'Select Command'}
              </Menu.Button>
            </div>
            <Menu.Items className='origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5'>
              {commands.map((cmd) => (
                <Menu.Item key={cmd.command}>
                  {({ active }) => (
                    <a
                      onClick={() => {
                        setSelectedCommand(cmd);
                      }}
                      className={`${active ? 'bg-blue-600 text-white' : 'text-gray-900'} block px-4 py-2 text-sm`}
                    >
                      {cmd.label}
                    </a>
                  )}
                </Menu.Item>
              ))}
            </Menu.Items>
          </Menu>
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${runningCommand ? 'bg-gray-500 cursor-not-allowed' : ''}`}
            disabled={runningCommand}
            onClick={runCommand}
          >
  Run
          </button>

        </div>
        <div className='flex flex-row items-center justify-center p-2 gap-2'>
          {selectedUser && (
            <div className='flex flex-col gap-2'>
              <FormattedUser id='admin' user={selectedUser} />
              {display('User', selectedUser)}

            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
