import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext } from 'react';
import { PageContext } from '../../contexts/pageContext';
import useMultiplayerSocket from '../../hooks/useMultiplayerSocket';
import Notifications from './notifications';

export default function UserInfo() {
  const { user, userLoading } = useContext(PageContext);
  const { connectedPlayersCount, socket, matches } = useMultiplayerSocket();
  const matchCountStr = matches.length > 0 && (
    <div className='flex flex-row'>
      <Link passHref href='/multiplayer' >
        <div className='flex flex-row'>
          <div data-tooltip='Current multiplayer matches' className='flex flex-row gap-2 qtip'>
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' />
            </svg>
            <span className='text-xs text-green-300'>{matches.length}  {matches.length > 1 ? '' : ''}</span></div>
        </div>
      </Link>
    </div>
  );

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

          { user && socket?.connected ? matchCountStr : null}
          <Notifications />
          <Link href={'/search'} passHref prefetch={false} >
            <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
              <path strokeLinecap='round' strokeLinejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
            </svg>
          </Link>
        </>
    }
  </>);
}
