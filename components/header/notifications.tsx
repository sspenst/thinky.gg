import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useContext, useEffect } from 'react';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import NotificationList from '../notification/notificationList';

export default function Notifications() {
  const { notifications, setNotifications, user } = useContext(AppContext);

  useEffect(() => {
    if (user) {
      setNotifications(user.notifications);
    }
  }, [setNotifications, user]);

  if (!user) {
    return null;
  }

  return (
    <Menu>
      <MenuButton aria-label='notifications'>
        <div className='flex items-start hover:opacity-70' id='notificationsBtn'>
          <Bell className='h-6 w-5' />
          {notifications.some(notification => !notification.read) && (
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
        <MenuItems
          className='fixed right-0 m-1 w-96 max-w-fit z-10 origin-top-right rounded-md shadow-lg border overflow-y-auto bg-1 border-color-3 h-fit'
          style={{
            // NB: hardcoded value accounting for header + menu margin
            maxHeight: 'calc(100% - 56px)',
            top: Dimensions.MenuHeight,
          }}
        >
          <MenuItem>
            {({ close }) => (<div className='flex flex-col gap-2'>
              <NotificationList
                close={close}
                notifications={notifications}
                setNotifications={setNotifications}
              />
              <div className='text-center pb-2 text-sm'>
                <Link href={'/notifications'} passHref className='underline'>
                  See all
                </Link>
              </div>
            </div>)}
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  );
}
