import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { IAdminCommand } from '@root/components/admin/types';
import AdminCommand from '@root/constants/adminCommand';
import Role from '@root/constants/role';
import { Fragment, useState } from 'react';
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
    <div className='flex flex-col gap-4'>
      <div className='flex items-center gap-3 mb-2'>
        <svg xmlns='http://www.w3.org/2000/svg' className='w-6 h-6 text-blue-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.013 8.013 0 01-7-4L3 20l4-9-3 1c0-4.418 3.582-8 8-8s8 3.582 8 8z' />
        </svg>
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
          Send Admin Message
        </h2>
      </div>
      <div className='space-y-4'>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Message</label>
          <ReactTextareaAutosize
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            onChange={(e) => setAdminMessage(e.currentTarget.value)}
            placeholder='Admin message...'
            value={adminMessage}
            minRows={3}
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Link (Optional)</label>
          <ReactTextareaAutosize
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            onChange={(e) => setAdminHref(e.currentTarget.value)}
            placeholder='Href (eg: "/pro")...'
            value={adminHref}
            minRows={1}
          />
        </div>
        <div className='flex gap-3 items-center'>
          <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Send to:</span>
          <Menu as='div' className='relative inline-block text-left'>
            <MenuButton
              aria-expanded='true'
              aria-haspopup='true'
              className='inline-flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
              id='menu-button'
            >
              {adminMessageRole ?? 'All'}
              <svg className='ml-2 h-4 w-4' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
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
              <MenuItems className='absolute right-0 z-10 mt-2 w-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none'>
                <div>
                  {Object.values(Role).map(role => (
                    <MenuItem key={`role-${role}`}>
                      <button
                        className='text-gray-700 dark:text-gray-300 px-4 py-2 text-sm w-full flex items-center justify-center data-[active]:bg-gray-100 dark:data-[active]:bg-gray-700 transition-colors'
                        onClick={() => setAdminMessageRole(role)}
                        role='menuitem'
                      >
                        {role}
                      </button>
                    </MenuItem>
                  ))}
                  <MenuItem key='role-all'>
                    <button
                      className='text-gray-700 dark:text-gray-300 px-4 py-2 text-sm w-full flex items-center justify-center data-[active]:bg-gray-100 dark:data-[active]:bg-gray-700 transition-colors border-t border-gray-200 dark:border-gray-600'
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
          className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-colors bg-blue-500 hover:bg-blue-600 text-white ${runningCommand ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={runningCommand}
          onClick={runCommandAdmin}
        >
          {runningCommand ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </div>
  );
}
