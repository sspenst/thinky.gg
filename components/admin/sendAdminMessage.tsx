import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import AdminCommand from '@root/constants/adminCommand';
import Role from '@root/constants/role';
import { IAdminCommand } from '@root/pages/[subdomain]/admin';
import React, { Fragment, useState } from 'react';
import toast from 'react-hot-toast';
import ReactTextareaAutosize from 'react-textarea-autosize';

interface SendAdminMessageProps {
  runningCommand: boolean;
  selectedUserCommand?: IAdminCommand;
  setRunningCommand: (running: boolean) => void;
}

export default function SendAdminMessage({ runningCommand, selectedUserCommand, setRunningCommand }: SendAdminMessageProps) {
  const [adminHref, setAdminHref] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [adminMessageRole, setAdminMessageRole] = useState<Role | null>(Role.ADMIN);

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

  return (
    <div className='flex flex-col gap-2'>
      <h2 className='text-2xl font-medium'>
        Send Admin Message
      </h2>
      <ReactTextareaAutosize
        onChange={(e) => setAdminMessage(e.currentTarget.value)}
        placeholder='Admin message...'
        value={adminMessage}
      />
      <ReactTextareaAutosize
        onChange={(e) => setAdminHref(e.currentTarget.value)}
        placeholder='Href (eg: "/pro")...'
        value={adminHref}
      />
      <div className='flex gap-2 items-center'>
        <span>To:</span>
        <Menu as='div' className='relative inline-block text-left'>
          <MenuButton
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
          </MenuButton>
          <Transition
            as={Fragment}
            enter='transition ease-out duration-100'
            enterFrom='transform opacity-0 scale-95'
            enterTo='transform opacity-100 scale-100'
            leave='transition ease-in duration-75'
            leaveFrom='transform opacity-100 scale-100'
            leaveTo='transform opacity-0 scale-95'
          >
            <MenuItems className='absolute right-0 z-10 mt-1 rounded-md overflow-hidden border bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border-color-1'>
              <div>
                {Object.values(Role).map(role => (
                  <MenuItem key={`role-${role}`}>
                    <button
                      className='text-black p-1 text-sm w-28 flex items-center gap-1 justify-center data-[active]:bg-neutral-300'
                      onClick={() => setAdminMessageRole(role)}
                      role='menuitem'
                    >
                      {role}
                    </button>
                  </MenuItem>
                ))}
                <MenuItem key='role-all'>
                  <button
                    className='text-black p-1 text-sm w-28 flex items-center gap-1 justify-center data-[active]:bg-neutral-300'
                    onClick={() => setAdminMessageRole(null)}
                    role='menuitem'
                  >
                      All
                  </button>
                </MenuItem>
              </div>
            </MenuItems>
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
  );
}
