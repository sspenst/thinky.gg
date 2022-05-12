import React, { useEffect, useRef } from 'react';
import Dimensions from '../../constants/dimensions';
import Link from 'next/link';
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
            <UserInfoDiv>
              <Link href={`/profile/${user._id}`} passHref>
                <a className='font-bold underline'>
                  {user.name}
                </a>
              </Link>
            </UserInfoDiv>
          </>
      }
    </div>
  );
}
