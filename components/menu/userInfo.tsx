import Link from 'next/link';
import React, { useEffect, useRef } from 'react';
import Dimensions from '../../constants/dimensions';
import useUser from '../../hooks/useUser';
import NotificationList from '../notification/notificationList';

interface UserInfoDivProps {
  children: JSX.Element | JSX.Element[];
}

function UserInfoDiv({ children }: UserInfoDivProps) {
  return (
    <div style={{
      float: 'left',
      padding: `0 ${Dimensions.MenuPadding}px`,
    }}>
      {children}
    </div>
  );
}

interface UserInfoProps {
  setWidth: (directoryWidth: number) => void;
}

export default function UserInfo({ setWidth }: UserInfoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { user, isLoading } = useUser();
  const [ showNotifications, setShowNotifications ] = React.useState(false);

  useEffect(() => {
    if (ref.current) {
      setWidth(ref.current.offsetWidth);
    }
  }, [isLoading, setWidth, user]);

  return (
    <div
      ref={ref}
      style={{
        float: 'left',
        lineHeight: Dimensions.MenuHeight + 'px',
      }}
    >
      {isLoading ?
        <UserInfoDiv>
          <span>Loading...</span>
        </UserInfoDiv>
        :
        !user ?
          <>
            <UserInfoDiv>
              <Link href='/login'>
                <a className='underline'>
                  Log In
                </a>
              </Link>
            </UserInfoDiv>
            <UserInfoDiv>
              <Link href='/signup'>
                <a className='underline'>
                  Sign Up
                </a>
              </Link>
            </UserInfoDiv>
          </>
          :
          <>
            <UserInfoDiv>
              <span>{`${user.score} `}</span>
              <span
                className='font-bold'
                style={{
                  color: 'var(--color-complete)',
                }}
              >
                ✓
              </span>
            </UserInfoDiv>
            <div
              style={{
                alignItems: 'center',
                display: 'flex',
                float: 'left',
                height: Dimensions.MenuHeight,
                padding: Dimensions.MenuPadding,
              }}
            >

              <button onClick={() => {setShowNotifications(!showNotifications);}}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-bell h-5 w-5" viewBox="0 0 16 16">
                  <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/>
                </svg>
              </button>
              { showNotifications ? (
                <div className="bg-white text-gray-500 absolute top-11 right-2 border border-gray-300 rounded-md shadow-lg w-96">
                  <NotificationList notifications={user.notifications}/>
                </div>
              ) : null }

            </div>
            <div
              style={{
                alignItems: 'center',
                display: 'flex',
                float: 'left',
                height: Dimensions.MenuHeight,
                padding: Dimensions.MenuPadding,
              }}
            >

              <Link href={'/search'} passHref prefetch={false}>
                <a>
                  <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                  </svg>
                </a>
              </Link>
            </div>
          </>
      }
    </div>
  );
}
