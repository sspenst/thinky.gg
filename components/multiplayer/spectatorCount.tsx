import React from 'react';
import { UserWithMultiplayerProfile } from '@root/models/db/user';

interface SpectatorCountProps {
  connectedPlayersInRoom?: {count: number, users: UserWithMultiplayerProfile[]};
}

export default function SpectatorCount({ connectedPlayersInRoom }: SpectatorCountProps) {
  if (!connectedPlayersInRoom || connectedPlayersInRoom.count <= 2) {
    return null;
  }

  return (
    <div className='absolute top-4 right-4 animate-fadeInRight'>
      <div className='bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1 border border-white/20'>
        <span className='text-sm text-white/80'>
          👁️ {connectedPlayersInRoom.count - 2} spectating
        </span>
      </div>
    </div>
  );
}