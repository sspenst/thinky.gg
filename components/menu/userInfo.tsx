import React, { useEffect, useRef } from 'react';
import Dimensions from '../../constants/dimensions';
import Link from 'next/link';
import useUser from '../../hooks/useUser';

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

  if (isLoading) {
    return null;
  }

  return (
    <div
      ref={ref}
      style={{
        float: 'left',
        lineHeight: Dimensions.MenuHeight + 'px',
      }}
    >
      {!user ?
        <>
          <div style={{
            float: 'left',
            padding: `0 ${Dimensions.MenuPadding}px`,
          }}>
            <Link href='/login'>
              <a className='underline'>
                Log In
              </a>
            </Link>
          </div>
          <div style={{
            float: 'left',
            padding: `0 ${Dimensions.MenuPadding}px`,
          }}>
            <Link href='/signup'>
              <a className='underline'>
                Sign Up
              </a>
            </Link>
          </div>
        </>
        :
        <>
          <div style={{
            float: 'left',
            padding: `0 ${Dimensions.MenuPadding}px`,
          }}>
            {`${user.score} `}
            <span 
              className='font-bold'
              style={{
                color: 'var(--color-complete)',
              }}
            >
              ✓
            </span>
          </div>
          <span
            style={{
              float: 'left',
              padding: `0 ${Dimensions.MenuPadding}px`,
            }}
          >
            <Link href={`/profile/${user.name}`} passHref>
              <a className='font-bold underline'>
                {user.name}
              </a>
            </Link>
          </span>
        </>
      }
    </div>
  );
}