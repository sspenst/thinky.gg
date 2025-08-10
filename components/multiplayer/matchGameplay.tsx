import GameRefactored from '@root/components/level/game-refactored';
import { GameState, MatchGameState } from '@root/helpers/gameStateHelpers';
import { MatchAction } from '@root/models/constants/multiplayer';
import Control from '@root/models/control';
import Level from '@root/models/db/level';
import React, { useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface MatchGameplayProps {
  activeLevel: Level;
  matchId: string;
  usedSkip: boolean;
  onMove: (gameState: MatchGameState) => void;
  onSkipUsed: () => void;
}

export default function MatchGameplay({ activeLevel, matchId, usedSkip, onMove, onSkipUsed }: MatchGameplayProps) {
  const btnSkip = useCallback(async() => {
    if (!activeLevel) {
      return;
    }

    if (confirm('Are you sure you want to skip this level? You only get one skip per match.')) {
      toast.dismiss();
      toast.loading('Skipping level...');

      fetch(`/api/match/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: MatchAction.SKIP_LEVEL
        }),
      }).then(res => {
        if (!res.ok) {
          throw res.text();
        }

        toast.dismiss();
        toast.success('Skipped level');
        onSkipUsed();
      }).catch(async err => {
        const error = JSON.parse(await err)?.error;

        toast.dismiss();
        toast.error(error || 'Failed to skip level');

        // if data.error contains 'already' then set usedSkip to true
        if (error?.toLowerCase().includes('already')) {
          onSkipUsed();
        }
      });
    }
  }, [activeLevel, matchId, onSkipUsed]);

  const skipControl = useCallback((disabled = false) => new Control(
    'control-skip',
    () => btnSkip(),
    <div className='flex justify-center items-center'>
      <span className='pl-2'>
      Skip
      </span>
      <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='currentColor' className='bi bi-arrow-right-short' viewBox='0 0 16 16'>
        <path fillRule='evenodd' d='M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z' />
      </svg>
    </div>,
    disabled,
  ), [btnSkip]);

  return (
    <div className='grow h-full w-full' key={'div-' + activeLevel._id.toString()}>
      <GameRefactored
        disableCheckpoints={true}
        enableSessionCheckpoint={false}
        extraControls={[skipControl(usedSkip)]}
        key={'game-' + activeLevel._id.toString()}
        level={activeLevel}
        matchId={matchId}
        onMove={(gameState: GameState) => {
          const matchGameState: MatchGameState = { ...gameState, leastMoves: activeLevel.leastMoves };

          onMove(matchGameState);
        }}
      />
    </div>
  );
}
