import { MusicContext } from '@root/contexts/musicContext';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import MusicModal from '../modal/musicModal';
import StyledTooltip from '../page/styledTooltip';
import Notifications from './notifications';

/**
 * If logged in:
 * - levels solved
 * - connected users + multiplayer matches
 * - notifications
 *
 * If not logged in:
 * - log in
 * - sign up
 */
function UserHeaderControls() {
  const { multiplayerSocket, user, userLoading } = useContext(AppContext);
  const { connectedPlayersCount, matches, socket } = multiplayerSocket;

  if (userLoading) {
    return <span>Loading...</span>;
  }

  if (!user) {
    return (<>
      <Link
        className='hover:underline'
        href='/login'
        onClick={() => {
          sessionStorage.clear();
        }}
      >
        Log In
      </Link>
      <Link href='/signup' className='hover:underline'>
        Sign Up
      </Link>
    </>);
  }

  return (<>
    <div
      className='hidden sm:block'
      data-tooltip-content='Levels Solved'
      data-tooltip-id='levels-solved-header'
      id='levelsSolvedBtn'
    >
      <span className='font-bold'>{user.score}</span>
      <StyledTooltip id='levels-solved-header' />
    </div>
    {socket?.connected && connectedPlayersCount > 0 &&
      <Link className='hover:opacity-70' id='multiplayerBtn' aria-label={`multiplayer - ${connectedPlayersCount} online`} href='/multiplayer' passHref>
        <div className='flex items-start -mr-1' data-tooltip-id='connected-players-count' data-tooltip-content={`${connectedPlayersCount} player${connectedPlayersCount !== 1 ? 's' : ''} online${matches.length > 0 ? `, ${matches.length} current multiplayer match${matches.length === 1 ? '' : 'es'}` : ''}`}>
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-6'>
            <path strokeLinecap='round' strokeLinejoin='round' d='M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z' />
          </svg>
          <div
            className='flex flex-col -ml-1 px-0.5 text-xs rounded-full'
            style={{
              backgroundColor: 'var(--bg-color-2)',
              fontSize: '0.75rem',
              lineHeight: '0.75rem',
              borderColor: 'var(--bg-color-2)',
            }}
          >
            <div className='text-green-500'>
              {connectedPlayersCount}
            </div>
            {matches.length > 0 &&
              <div className='text-green-300'>
                {matches.length}
              </div>
            }
          </div>
        </div>
        <StyledTooltip id='connected-players-count' />
      </Link>
    }
    <Notifications />
  </>);
}

export default function HeaderControls() {
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const { isHot, isPlaying } = useContext(MusicContext);

  return (<>
    <UserHeaderControls />
    <Link id='searchBtn' aria-label='search' className='hidden sm:block hover:opacity-70' href={'/search'} passHref prefetch={false}>
      <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
        <path strokeLinecap='round' strokeLinejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
      </svg>
    </Link>
    <button className={classNames('hover:opacity-70', { 'animate-pulse': isPlaying }, isPlaying && (isHot ? 'text-orange-400' : 'text-blue-400'))} onClick={() => setIsMusicModalOpen(true)}>
      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z' />
      </svg>
    </button>
    <MusicModal
      closeModal={() => setIsMusicModalOpen(false)}
      isOpen={isMusicModalOpen}
    />
  </>);
}
