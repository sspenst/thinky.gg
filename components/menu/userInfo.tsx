import Link from 'next/link';
import React, { useContext, useEffect, useRef } from 'react';
import Dimensions from '../../constants/dimensions';
import { PageContext } from '../../contexts/pageContext';
import Notifications from './notifications';

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
  const { user, userLoading } = useContext(PageContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setWidth(ref.current.offsetWidth);
    }
  }, [setWidth, user, userLoading]);

  return (
    <div
      ref={ref}
      style={{
        float: 'left',
        lineHeight: Dimensions.MenuHeight + 'px',
      }}
    >
      {userLoading ?
        <UserInfoDiv>
          <span>Loading...</span>
        </UserInfoDiv>
        :
        !user ?
          <>
            <UserInfoDiv>
              <Link href='/login' className='underline'>
                Log In
              </Link>
            </UserInfoDiv>
            <UserInfoDiv>
              <Link href='/signup' className='underline'>
                Sign Up
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
            <Notifications />
            <div
              className='items-center flex float-left'
              style={{
                height: Dimensions.MenuHeight,
                padding: Dimensions.MenuPadding,
              }}
            >
              <Link href={'/search'} passHref prefetch={false}>
                <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                </svg>
              </Link>
            </div>
          </>
      }
    </div>
  );
}
