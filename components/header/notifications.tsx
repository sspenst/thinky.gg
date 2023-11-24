import { Menu, Transition } from '@headlessui/react';
import Link from 'next/link';
import React, { Fragment, useCallback, useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import Notification from '../../models/db/notification';
import NotificationList from '../notification/notificationList';

export default function Notifications() {
  const { user } = useContext(AppContext);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    const res = await fetch('/api/notification');
    const data = await res.json();

    setIsLoading(false);
    setNotifications(data);
  }, []);

  useEffect(() => {
    if (expanded) {
      fetchNotifications();
    }
  }
  , [expanded, fetchNotifications]);

  if (!user) {
    return null;
  }

  return (
    <Menu>
      <Menu.Button onClickCapture={() => {
        setExpanded(!expanded);
      }} aria-label='notifications'>
        <div className='flex items-start hover:opacity-70' id='notificationsBtn'>
          <svg xmlns='http://www.w3.org/2000/svg' fill='currentColor' className='bi bi-bell h-6 w-5' viewBox='0 0 17 17'>
            <path d='M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z' />
          </svg>
          {user.unreadNotifCount > 0 && (
            <div
              id='smallindicator'
              className='absolute ml-3 h-2 w-2 bg-red-500 rounded-full border'
              style={{
                borderColor: 'var(--bg-color-2)',
                borderRadius: 5,
                height: 10,
                width: 10,
              }}
            />
          )}
        </div>
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
        <Menu.Items
          className='absolute right-0 m-1 w-96 max-w-fit z-10 origin-top-right rounded-md shadow-lg border overflow-y-auto'
          style={{
            backgroundColor: 'var(--bg-color-2)',
            borderColor: 'var(--bg-color-4)',
            color: 'var(--color)',
            height: 'fit-content',
            // NB: hardcoded value accounting for header + menu margin
            maxHeight: 'calc(100% - 56px)',
            top: Dimensions.MenuHeight,
          }}
        >
          <Menu.Item>
            {({ close }) => (<>

              <>

                <NotificationList
                  close={close}
                  isLoading={isLoading}
                  notifications={notifications}
                  setNotifications={setNotifications}
                />

                <div className='flex flex-col text-center pb-2 text-sm'>
                  <Link href={'/notifications'} passHref className='underline'>
                  See all
                  </Link>
                  <span className='text-xs'>{user.unreadNotifCount} unread</span>
                </div>

              </>

            </>)}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
