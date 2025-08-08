import React from 'react';
import { UserWithMultiplayerProfile } from '@root/models/db/user';
import { MultiplayerMatchState } from '@root/models/constants/multiplayer';

interface SpectatorCountProps {
  connectedPlayersInRoom?: {count: number, users: UserWithMultiplayerProfile[]};
  matchState?: MultiplayerMatchState;
}

export default function SpectatorCount({ connectedPlayersInRoom, matchState }: SpectatorCountProps) {
  if (!connectedPlayersInRoom) {
    return null;
  }

  const isFinished = matchState === MultiplayerMatchState.FINISHED || matchState === MultiplayerMatchState.ABORTED;
  
  // For finished matches, show total viewers (don't subtract players)
  // For active matches, show spectators (subtract 2 active players)
  const count = isFinished ? connectedPlayersInRoom.count : connectedPlayersInRoom.count - 2;
  const label = isFinished ? 'viewing' : 'spectating';
  
  if (count <= 0) {
    return null;
  }

  return (
    <div className='absolute top-4 right-4 animate-fadeInRight'>
      <div className='bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1 border border-white/20'>
        <span className='text-sm text-white/80'>
          👁️ {count} {label}
        </span>
      </div>
    </div>
  );
}