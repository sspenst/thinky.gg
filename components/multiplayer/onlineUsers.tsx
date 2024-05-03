import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext } from 'react';
import { AppContext } from '../../contexts/appContext';

export default function OnlineUsers() {
  const { multiplayerSocket } = useContext(AppContext);
  const { connectedPlayersCount, socket } = multiplayerSocket;
  const isConnected = !!socket?.connected;

  return (
    <Link href='/multiplayer' passHref>
      <div className='py-0.5 px-2.5 border rounded flex items-center gap-2' style={{
        borderColor: 'var(--bg-color-3)',
      }}>
        {!isConnected && <span className='animate-ping absolute inline-flex rounded-full bg-yellow-500 opacity-75 h-2.5 w-2.5' />}
        <span className={classNames(isConnected ? 'bg-green-500' : 'bg-yellow-500', 'h-2.5 w-2.5 rounded-full')} />
        <span>{isConnected ? `${connectedPlayersCount} player${connectedPlayersCount !== 1 ? 's' : ''} online` : 'Connecting...'}</span>
      </div>
    </Link>
  );
}
