import { ScreenSize } from '@root/hooks/useDeviceCheck';
import Link from 'next/link';
import { useContext } from 'react';
import { AppContext } from '../../contexts/appContext';
import StyledTooltip from '../page/styledTooltip';

export default function HeaderMultiplayer() {
  const { deviceInfo, multiplayerSocket, user } = useContext(AppContext);
  const { connectedPlayersCount, matches, socket } = multiplayerSocket;

  if (!user || deviceInfo.screenSize < ScreenSize.SM) {
    return null;
  }

  const isConnected = !!socket?.connected;

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
          <path strokeLinecap='round' strokeLinejoin='round' d='M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' />
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
