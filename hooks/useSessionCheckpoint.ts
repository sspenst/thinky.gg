import Direction from '@root/constants/direction';
import { directionsToGameState, isValidDirections } from '@root/helpers/checkpointHelpers';
import { GameState } from '@root/helpers/gameStateHelpers';
import { Types } from 'mongoose';
import { useCallback, useRef } from 'react';
import { debounce } from 'throttle-debounce';

interface SessionCheckpoint {
  _id: Types.ObjectId;
  directions: Direction[];
}

interface UseSessionCheckpointProps {
  levelId: Types.ObjectId;
  levelData: string;
  enabled?: boolean;
}

interface UseSessionCheckpointReturn {
  saveSessionToSessionStorage: (gameState: GameState) => void;
  restoreSessionCheckpoint: () => GameState | null;
}

export default function useSessionCheckpoint({
  levelId,
  levelData,
  enabled = false,
}: UseSessionCheckpointProps): UseSessionCheckpointReturn {
  const sessionCheckpointRestored = useRef(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saveSessionToSessionStorage = useCallback(debounce(100, (gameState: GameState) => {
    if (!enabled || typeof window.sessionStorage === 'undefined') {
      return;
    }

    window.sessionStorage.setItem('sessionCheckpoint', JSON.stringify({
      _id: levelId,
      directions: gameState.moves.map(move => move.direction),
    } as SessionCheckpoint));
  }), [levelId, enabled]);

  const restoreSessionCheckpoint = useCallback((): GameState | null => {
    if (!enabled ||
        sessionCheckpointRestored.current ||
        typeof window.sessionStorage === 'undefined') {
      return null;
    }

    const sessionCheckpointStr = window.sessionStorage.getItem('sessionCheckpoint');

    if (!sessionCheckpointStr) {
      return null;
    }

    try {
      const sessionCheckpoint = JSON.parse(sessionCheckpointStr) as SessionCheckpoint;

      if (sessionCheckpoint._id !== levelId || !isValidDirections(sessionCheckpoint.directions)) {
        return null;
      }

      const newGameState = directionsToGameState(sessionCheckpoint.directions, levelData);

      if (!newGameState) {
        return null;
      }

      sessionCheckpointRestored.current = true;

      return newGameState;
    } catch (error) {
      console.error('Error restoring session checkpoint:', error);

      return null;
    }
  }, [enabled, levelId, levelData]);

  return {
    saveSessionToSessionStorage,
    restoreSessionCheckpoint,
  };
}
