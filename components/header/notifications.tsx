import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import getFontFromGameId from '@root/helpers/getFont';
import classNames from 'classnames';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useContext, useEffect } from 'react';
import { AppContext } from '../../contexts/appContext';
import NotificationList from '../notification/notificationList';

export default function Notifications() {
  const { game, notifications, setNotifications, user } = useContext(AppContext);

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
      <MenuButton
        aria-label='notifications'
        className='flex items-start hover:opacity-70 focus:outline-hidden'
        id='notificationsBtn'
      >
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
      </MenuButton>
      <MenuItems
        anchor={{
          to: 'bottom start',
          gap: '15px', // move down
          padding: '4px', // Minimum padding from viewport edges
        }}
        className={classNames('p-1 w-96 origin-top-right rounded-[10px] shadow-lg border overflow-y-auto bg-1 border-color-3 transition duration-100 ease-out focus:outline-hidden data-closed:scale-95 data-closed:opacity-0 z-20', getFontFromGameId(game.id))}
        modal={false}
        transition
      >
        <MenuItem>
          <div className='flex flex-col gap-2'>
            <NotificationList
              notifications={notifications}
              setNotifications={setNotifications}
            />
            <div className='text-center pb-2 text-sm'>
              <Link href={'/notifications'} passHref className='underline'>
                See all
              </Link>
            </div>
          </div>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
