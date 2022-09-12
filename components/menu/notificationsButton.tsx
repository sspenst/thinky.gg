import { Dialog, Transition } from '@headlessui/react';
import Link from 'next/link';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { PageContext } from '../../contexts/pageContext';
import useUser from '../../hooks/useUser';
import Notification from '../../models/db/notification';
import NotificationList from '../notification/notificationList';

export default function NotificationsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { mutateUser, user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { setIsModalOpen } = useContext(PageContext);

  useEffect(() => {
    setIsModalOpen(isOpen);
  }, [isOpen, setIsModalOpen]);

  useEffect(() => {
    if (user) {
      setNotifications(user.notifications);
    }
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        float: 'left',
        height: Dimensions.MenuHeight,
        padding: Dimensions.MenuPadding,
      }}
    >
      <button onClick={() => {
        mutateUser();
        setIsOpen(true);
      }}>
        <div className='flex items-start'>
          <svg xmlns='http://www.w3.org/2000/svg' fill='currentColor' className='bi bi-bell h-6 w-5' viewBox='0 0 17 17'>
            <path d='M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z' />
          </svg>
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
      </button>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as='div'
          className='fixed inset-0 z-10 overflow-y-auto'
          onClose={() => setIsOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-100'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-100'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <Dialog.Overlay className='fixed inset-0' />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-100'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-100'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <div
              className={'shadow-md w-96 max-w-fit'}
              style={{
                backgroundColor: 'var(--bg-color-2)',
                borderBottomLeftRadius: 6,
                borderBottomRightRadius: 6,
                borderColor: 'var(--bg-color-4)',
                borderStyle: 'solid',
                borderWidth: '0 1px 1px 1px',
                color: 'var(--color)',
                position: 'absolute',
                right: Dimensions.MenuPadding,
                // minus 1 to overlap the menu border
                top: Dimensions.MenuHeight - 1,
              }}
            >
              <NotificationList
                mutateNotifications={mutateUser}
                notifications={notifications}
                setNotifications={setNotifications}
              />
              <div className='text-center pb-2 text-sm'>
                <Link href={'/notifications'} passHref>
                  <a className='underline'>
                    See all
                  </a>
                </Link>
              </div>
            </div>
          </Transition.Child>
        </Dialog>
      </Transition>
    </div>
  );
}
