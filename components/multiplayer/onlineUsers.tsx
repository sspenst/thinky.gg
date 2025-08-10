import classNames from 'classnames';
import Link from 'next/link';
import { useContext } from 'react';
import { AppContext } from '../../contexts/appContext';

export default function OnlineUsers() {
  const { multiplayerSocket } = useContext(AppContext);
  const { connectedPlayersCount, socket } = multiplayerSocket;
  const isConnected = !!socket?.connected;

  return (
    <Link href='/multiplayer' passHref>
      <div className='relative inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/15 transition-colors duration-200'>
        {!isConnected && <span className='animate-ping absolute inline-flex rounded-full bg-yellow-400 opacity-75 h-2.5 w-2.5' />}
        <span className={classNames(
          'h-2.5 w-2.5 rounded-full',
          isConnected ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-yellow-400'
        )} />
        <span className='text-sm font-medium text-white'>
          {isConnected ? (
            <>
              <span className='text-green-400 font-bold'>{connectedPlayersCount}</span>
              <span className='text-white/80'> player{connectedPlayersCount !== 1 ? 's' : ''} online</span>
            </>
          ) : (
            <span className='text-yellow-400'>Connecting...</span>
          )}
        </span>
      </div>
    </Link>
  );
}
