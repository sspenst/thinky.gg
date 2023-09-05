import { Combobox, Menu } from '@headlessui/react';
import MultiSelectUser from '@root/components/page/multiSelectUser';
import Page from '@root/components/page/page';
import Role from '@root/constants/role';
import dbConnect from '@root/lib/dbConnect';
import { getUserFromToken } from '@root/lib/withAuth';
import User from '@root/models/db/user';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { useState } from 'react';
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

  return {
    props: {},
  };
}

export default function AdminPage() {
  const [selectedCommand, setSelectedCommand] = useState('Select Command');
  const [selectedUser, setSelectedUser] = useState<User>();

  return (
    <Page title='Admin Page'>
      <div className='p-2'>
        <h1 className='flex flex-col items-center justify-center  text-2xl'>Admin Page</h1>

        <div className='flex flex-row items-center justify-center p-2 gap-2'>
          <p className='text-xl'>Run command on user:</p>
          <MultiSelectUser defaultValue={selectedUser} onSelect={(selected: User) => setSelectedUser(selected)} />

          <Menu as='div' className='relative inline-block text-left'>
            <div>
              <Menu.Button className='border border-gray-300 bg-gray rounded-md shadow-sm px-4 py-2 text-sm flex flex-row items-center justify-center gap-2'>
                {selectedCommand}
              </Menu.Button>
            </div>
            <Menu.Items className='origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5'>
              <Menu.Item>
                {({ active }) => (
                  <a
                    onClick={() => setSelectedCommand('refreshAchievements')}
                    className={`${active ? 'bg-blue-600 text-white' : 'text-gray-900'} block px-4 py-2 text-sm`}
                  >
                  refreshAchievements
                  </a>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <a
                    onClick={() => setSelectedCommand('calcPlayAttempts')}
                    className={`${active ? 'bg-blue-600 text-white' : 'text-gray-900'} block px-4 py-2 text-sm`}
                  >
                  refreshPlayAttempts
                  </a>
                )}
              </Menu.Item>
            </Menu.Items>
          </Menu>

          <button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
            onClick={async () => {
              toast.dismiss();
              toast.loading('Running command...');
              const resp = await fetch('/api/admin', {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  command: selectedCommand,
                  targetId: selectedUser?._id
                }),
              });
              const json = await resp.json();

              if (json.error) {
                toast.error(json.error);
              } else {
                toast.success('Command ran successfully');
              }
            }}
          >
          Run
          </button>
        </div>

      </div>

    </Page>
  );
}
