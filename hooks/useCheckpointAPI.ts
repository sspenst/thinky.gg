import Direction from '@root/constants/direction';
import { directionsToGameState, isValidDirections } from '@root/helpers/checkpointHelpers';
import { areEqualGameStates, cloneGameState, GameState } from '@root/helpers/gameStateHelpers';
import { BEST_CHECKPOINT_INDEX } from '@root/hooks/useCheckpoints';
import { Types } from 'mongoose';
import React, { useCallback } from 'react';
import toast from 'react-hot-toast';

interface UseCheckpointAPIProps {
  levelId: Types.ObjectId;
  levelData: string;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  oldGameState: React.MutableRefObject<GameState | undefined>;
  checkpoints?: (Direction[] | null)[];
  mutateCheckpoints: () => void;
}

interface UseCheckpointAPIReturn {
  saveCheckpoint: (index: number) => void;
  deleteCheckpoint: (index: number) => void;
  loadCheckpoint: (index: number) => void;
}

export default function useCheckpointAPI({
  levelId,
  levelData,
  gameState,
  setGameState,
  oldGameState,
  checkpoints,
  mutateCheckpoints,
}: UseCheckpointAPIProps): UseCheckpointAPIReturn {
  const saveCheckpoint = useCallback((index: number) => {
    if (index !== BEST_CHECKPOINT_INDEX) {
      toast.dismiss();
      toast.loading(`Saving checkpoint ${index}...`);
    }

    fetch('/api/level/' + levelId + '/checkpoints', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        index: index,
        directions: gameState.moves.map(move => move.direction),
      }),
    }).then(async res => {
      if (res.status === 200) {
        if (index !== BEST_CHECKPOINT_INDEX) {
          toast.dismiss();
          toast.success(`Saved checkpoint ${index}`);
        }

        mutateCheckpoints();
      } else {
        throw res.text();
      }
    }).catch(async err => {
      console.error(err);

      if (index !== BEST_CHECKPOINT_INDEX) {
        toast.dismiss();
        toast.error(JSON.parse(await err)?.error || 'Error saving checkpoint');
      }
    });
  }, [gameState, levelId, mutateCheckpoints]);

  const deleteCheckpoint = useCallback((index: number) => {
    if (index !== BEST_CHECKPOINT_INDEX) {
      toast.dismiss();
      toast.loading(`Deleting checkpoint ${index}...`);
    }

    fetch(`/api/level/${levelId}/checkpoints?index=${index}`, {
      method: 'DELETE',
    }).then(async res => {
      if (res.status === 200) {
        if (index !== BEST_CHECKPOINT_INDEX) {
          toast.dismiss();
          toast.success(`Deleted checkpoint ${index}`);
        }

        mutateCheckpoints();
      } else {
        throw res.text();
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Error deleting checkpoint');
    });
  }, [levelId, mutateCheckpoints]);

  const loadCheckpoint = useCallback((index: number) => {
    if (!checkpoints) {
      toast.dismiss();
      toast.error('No checkpoints to restore');

      return;
    }

    const checkpoint = checkpoints[index];

    if (!checkpoint) {
      return;
    }

    if (!isValidDirections(checkpoint)) {
      toast.dismiss();
      toast.error('Corrupted checkpoint');

      return;
    }

    const checkpointGameState = directionsToGameState(checkpoint, levelData);

    if (!checkpointGameState) {
      toast.dismiss();
      toast.error('Invalid checkpoint');

      return;
    }

    if (!areEqualGameStates(checkpointGameState, gameState)) {
      oldGameState.current = cloneGameState(gameState);
      setGameState(checkpointGameState);

      const undoText = React.createElement('span', {
        className: 'text-blue-400',
        style: { cursor: 'pointer' },
        onClick: () => {
          loadCheckpoint(index);
          toast.dismiss();
        }
      }, 'undo');

      const message = React.createElement('div', {},
        index === BEST_CHECKPOINT_INDEX ?
          'Restored your best completion. Press B again to ' :
          `Restored checkpoint ${index}. Press ${index} again to `,
        undoText
      );

      toast.dismiss();
      toast.success(message, { duration: 3000 });
    } else if (oldGameState.current) {
      setGameState(cloneGameState(oldGameState.current));
      oldGameState.current = undefined;
      toast.dismiss();
      toast.error('Undoing checkpoint restore', { duration: 1500, icon: '👍' });
    }
  }, [checkpoints, gameState, levelData, setGameState, oldGameState]);

  return {
    saveCheckpoint,
    deleteCheckpoint,
    loadCheckpoint,
  };
}
