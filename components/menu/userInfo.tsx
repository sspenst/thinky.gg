import Link from 'next/link';
import React, { useContext } from 'react';
import { PageContext } from '../../contexts/pageContext';
import Notifications from './notifications';

export default function UserInfo() {
  const { user, userLoading } = useContext(PageContext);

  return (<>
    {userLoading ?
      <span>Loading...</span>
      :
      !user ?
        <>
          <Link onClick={() => {
            sessionStorage.clear();
          }} href='/login' className='underline'>
            Log In
          </Link>
          <Link href='/signup' className='underline'>
            Sign Up
          </Link>
        </>
        :
        <>
          <span className='font-bold qtip' data-tooltip={'Levels Completed'}>{user.score}</span>
          <Notifications />
          <Link href={'/search'} passHref prefetch={false}>
            <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
              <path strokeLinecap='round' strokeLinejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
            </svg>
          </Link>
        </>
    }
  </>);
}
