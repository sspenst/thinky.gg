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
          <Link href='/login' className='underline'>
            Log In
          </Link>
          <Link href='/signup' className='underline'>
            Sign Up
          </Link>
        </>
        :
        <>
          <div className='flex gap-1'>
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M9 12.75L11.25 15 15 9.75M21 12' />
            </svg>
            <span className='font-bold'>{user.score}</span>
          </div>
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
