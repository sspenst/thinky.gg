import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useContext, useEffect, useRef, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import NotificationList from '../notification/notificationList';

export default function Notifications() {
  const { notifications, setNotifications, user } = useContext(AppContext);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      setNotifications(user.notifications);
    }
  }, [setNotifications, user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  if (!user) {
    return null;
  }

  const closeDropdown = () => setIsOpen(false);

  return (
    <div ref={dropdownRef} className='relative'>
      <button
        aria-label='notifications'
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-start hover:opacity-70'
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
      </button>
      {isOpen && (
        <div
          className={`fixed right-0 m-1 w-96 max-w-fit z-10 origin-top-right rounded-md shadow-lg border overflow-y-auto bg-1 border-color-3 h-fit transition-all duration-100 ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{
            maxHeight: 'calc(100% - 56px)',
            top: Dimensions.MenuHeight,
          }}
        >
          <div className='flex flex-col gap-2'>
            <NotificationList
              close={closeDropdown}
              notifications={notifications}
              setNotifications={setNotifications}
            />
            <div className='text-center pb-2 text-sm'>
              <Link href={'/notifications'} passHref className='underline'>
                See all
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
