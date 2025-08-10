import { MultiplayerMatchState } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import React from 'react';

interface AbortedMatchInfoProps {
  match: MultiplayerMatch;
}

export default function AbortedMatchInfo({ match }: AbortedMatchInfoProps) {
  if (match.state !== MultiplayerMatchState.ABORTED) {
    return null;
  }

  const playersNotMarkedReady = match.players.filter(player => !(match.markedReady as string[]).includes(player._id.toString()));

  return (
    <div className='flex justify-center mb-6 animate-fadeInUp' style={{ animationDelay: '0.3s' }}>
      <div className='relative'>
        <div className='absolute -inset-2 bg-gradient-to-r from-red-600/15 to-pink-600/15 blur-lg opacity-40' />
        <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
          <div className='text-center'>
            <div className='w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3'>
              <span className='text-2xl text-white'>❌</span>
            </div>
            <h3 className='text-lg font-bold mb-2'>
              <span className='bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent'>
                Match Aborted
              </span>
            </h3>
            <div className='space-y-1'>
              {playersNotMarkedReady.map(player => (
                <div key={player._id.toString()} className='text-sm text-white/70'>
                  {player.name} did not mark ready
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
