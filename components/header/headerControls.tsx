import { GameType } from '@root/constants/Games';
import { ScreenSize } from '@root/hooks/useDeviceCheck';
import Link from 'next/link';
import React, { useContext, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import MusicModal from '../modal/musicModal';
import StyledTooltip from '../page/styledTooltip';
import MusicIcon from './musicIcon';
import Notifications from './notifications';

function HeaderMultiplayer() {
  const { deviceInfo, multiplayerSocket, user } = useContext(AppContext);
  const { connectedPlayersCount, matches, socket } = multiplayerSocket;

  if (!user || deviceInfo.screenSize < ScreenSize.SM) {
    return null;
  }

  const isConnected = socket?.connected && connectedPlayersCount > 0;

  function getTooltipContent() {
    if (!isConnected) {
      return 'Connecting...';
    }

    return `${connectedPlayersCount} player${connectedPlayersCount !== 1 ? 's' : ''} online${matches.length > 0 ? `, ${matches.length} current multiplayer match${matches.length === 1 ? '' : 'es'}` : ''}`;
  }

  return (<>
    <Link className='hover:opacity-70' id='multiplayerBtn' aria-label={`multiplayer - ${connectedPlayersCount} online`} href='/multiplayer' passHref>
      <div className='flex items-start -mr-1' data-tooltip-id='connected-players-count' data-tooltip-content={getTooltipContent()}>
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-6'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z' />
        </svg>
        <div
          className='flex flex-col -ml-1 px-0.5 text-xs rounded-full bg-1'
          style={{
            fontSize: '0.75rem',
            lineHeight: '0.75rem',
          }}
        >
          {!isConnected ?
            <div className='h-3 w-2 pt-0.5'>
              <span className='animate-ping absolute inline-flex rounded-full bg-yellow-500 opacity-75 h-2 w-2' />
              <span className='bg-yellow-500 absolute h-2 w-2 rounded-full' />
            </div>
            :
            <>
              <div className='text-green-500'>
                {connectedPlayersCount}
              </div>
              {matches.length > 0 &&
                <div className='text-green-300'>
                  {matches.length}
                </div>
              }
            </>
          }
        </div>
      </div>
    </Link>
    <StyledTooltip id='connected-players-count' />
  </>);
}

export default function HeaderControls() {
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const { game, user } = useContext(AppContext);

  return (<>
    {!game.isNotAGame && <>
      <Link id='searchBtn' aria-label='search' className='hover:opacity-70' href={'/search'} passHref prefetch={false}>
        <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
          <path strokeLinecap='round' strokeLinejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
        </svg>
      </Link>
      <HeaderMultiplayer />
    </>
    }
    <button className='hidden sm:block hover:opacity-70' onClick={() => setIsMusicModalOpen(true)}>
      <MusicIcon />
    </button>
    {user && <Notifications />}
    <MusicModal
      closeModal={() => setIsMusicModalOpen(false)}
      isOpen={isMusicModalOpen}
    />
  </>);
}
