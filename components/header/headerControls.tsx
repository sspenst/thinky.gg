import { MusicContext } from '@root/contexts/musicContext';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import MusicModal from '../modal/musicModal';
import StyledTooltip from '../page/styledTooltip';
import Notifications from './notifications';

function UserHeaderControls() {
  const { multiplayerSocket, user, userLoading } = useContext(AppContext);
  const { connectedPlayersCount, matches, socket } = multiplayerSocket;

  if (userLoading) {
    return <span>Loading...</span>;
  }

  if (!user) {
    return (<>
      <Link
        className='underline'
        href='/login'
        onClick={() => {
          sessionStorage.clear();
        }}
      >
        Log In
      </Link>
      <Link href='/signup' className='underline'>
        Sign Up
      </Link>
    </>);
  }

  return (<>
    <span id='levelsSolvedBtn' className='font-bold' data-tooltip-content={'Levels Solved'} data-tooltip-id='levels-solved'>{user.score}</span>
    <StyledTooltip id='levels-solved' />
    {socket?.connected && (<>
      {connectedPlayersCount > 0 &&
        <Link id='multiplayerBtn' aria-label={`multiplayer - ${connectedPlayersCount} online`} href='/multiplayer' passHref>
          <div className='flex items-start -mr-1' data-tooltip-id='connected-players-count' data-tooltip-content={`${connectedPlayersCount} player${connectedPlayersCount !== 1 ? 's' : ''} online`}>
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-6'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z' />
            </svg>
            <div
              className='-ml-1 px-0.5 text-xs rounded-full text-green-500'
              style={{
                backgroundColor: 'var(--bg-color-2)',
                fontSize: '0.75rem',
                lineHeight: '0.75rem',
                borderColor: 'var(--bg-color-2)',
              }}
            >
              {connectedPlayersCount}
            </div>
          </div>
          <StyledTooltip id='connected-players-count' />
        </Link>
      }
      {matches.length > 0 &&
        <Link id='multiplayerActiveBtn' aria-label={`multiplayer - ${matches.length} matches`} passHref href='/multiplayer' >
          <div className='flex items-start -mr-1' data-tooltip-id='multiplayer-match-count' data-tooltip-content={`${matches.length} current multiplayer match${matches.length === 1 ? '' : 'es'}`}>
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-6'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' />
            </svg>
            <div
              className='-ml-1 px-0.5 text-xs rounded-full text-green-300'
              style={{
                backgroundColor: 'var(--bg-color-2)',
                fontSize: '0.75rem',
                lineHeight: '0.75rem',
                borderColor: 'var(--bg-color-2)',
              }}
            >
              {matches.length}
            </div>
          </div>
          <StyledTooltip id='multiplayer-match-count' />
        </Link>
      }
    </>)}
    <Notifications />
  </>);
}

export default function HeaderControls() {
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const { isHot, isPlaying } = useContext(MusicContext);

  return (
    <>
      <UserHeaderControls />
      <Link id='searchBtn' aria-label='search' href={'/search'} passHref prefetch={false}>
        <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
          <path strokeLinecap='round' strokeLinejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
        </svg>
      </Link>
      <button className={classNames({ 'animate-pulse': isPlaying }, isPlaying && (isHot ? 'text-orange-400' : 'text-blue-400'))} onClick={() => setIsMusicModalOpen(true)}>
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z' />
        </svg>
      </button>
      <MusicModal
        closeModal={() => setIsMusicModalOpen(false)}
        isOpen={isMusicModalOpen}
      />
    </>
  );
}