import Link from 'next/link';
import React, { useEffect, useRef } from 'react';
import Dimensions from '../../constants/dimensions';
import useUser from '../../hooks/useUser';

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
