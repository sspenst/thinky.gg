import FormattedUser from '@root/components/formatted/formattedUser';
import Grid from '@root/components/level/grid';
import Dimensions from '@root/constants/dimensions';
import { MatchGameState } from '@root/helpers/gameStateHelpers';
import { MultiplayerMatchState } from '@root/models/constants/multiplayer';
import Level from '@root/models/db/level';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import Link from 'next/link';
import React from 'react';

interface LiveSpectatorGridsProps {
  match: MultiplayerMatch;
  matchGameStateMap: Record<string, MatchGameState>;
  getLevelIndexByPlayerId: (playerId: string) => number;
}

export default function LiveSpectatorGrids({ match, matchGameStateMap, getLevelIndexByPlayerId }: LiveSpectatorGridsProps) {
  if (match.state === MultiplayerMatchState.FINISHED || match.state === MultiplayerMatchState.ABORTED) {
    return null;
  }

  // Don't render if no levels are available (e.g., before match starts)
  if (!match.levels || match.levels.length === 0) {
    return null;
  }

  return (
    <div className='w-full max-w-6xl'>
      <h2 className='text-2xl font-bold text-center mb-6'>
        <span className='bg-linear-to-r from-green-400 to-blue-400 bg-clip-text text-transparent'>
          Live Match View
        </span>
      </h2>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {match.players.map(player => {
          const playerId = player._id.toString();
          const matchGameState = matchGameStateMap[playerId];
          const levelIndex = getLevelIndexByPlayerId(playerId);

          if (levelIndex === -1) {
            return null;
          }

          const level = match.levels[levelIndex] as Level;

          if (!level) {
            return null;
          }

          return (
            <div className='relative' key={`match-game-state-${player._id.toString()}-${level._id.toString()}`}>
              <div className='absolute -inset-2 bg-linear-to-r from-green-600/15 to-blue-600/15 blur-lg opacity-40' />
              <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-4 shadow-lg border border-white/20'>
                <div className='flex flex-col items-center gap-3'>
                  <div className='flex items-center gap-2'>
                    <span className='text-lg'>🎮</span>
                    <FormattedUser id='match-recap' size={Dimensions.AvatarSizeSmall} user={player} />
                  </div>
                  <div className='flex flex-col justify-center text-center w-full bg-white/5 rounded-lg p-4' style={{
                    height: '50vh',
                  }}>
                    {matchGameState ?
                      <Grid
                        gameState={matchGameState}
                        id={level._id.toString()}
                        leastMoves={matchGameState.leastMoves || 0}
                        optimizeDom
                      />
                      :
                      <span className='italic text-white/60'>Waiting for move...</span>
                    }
                  </div>
                  <Link className='font-medium text-blue-400 hover:text-blue-300 underline truncate max-w-full transition-colors duration-200' href={`/level/${level?.slug || '#'}`}>
                    {level?.name || 'Unknown Level'}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
