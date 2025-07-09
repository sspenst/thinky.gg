import Direction from '@root/constants/direction';
import { cloneGameState, GameState, initGameState, makeMove, undo } from '@root/helpers/gameStateHelpers';
import { useCallback, useRef, useState } from 'react';
import Level from '../models/db/level';

interface UseGameStateProps {
  level: Level;
  disableAutoUndo?: boolean;
  onMove?: (gameState: GameState) => void;
  isComplete: (gameState: GameState) => boolean;
}

interface MoveResult {
  success: boolean;
  isComplete: boolean;
}

interface UseGameStateReturn {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  oldGameState: React.MutableRefObject<GameState | undefined>;
  restart: () => void;
  makeGameMove: (direction: Direction) => MoveResult;
  undoMove: () => boolean;
  redoMove: () => boolean;
  restoreOldGameState: () => boolean;
  cloneCurrentGameState: () => GameState;
}

export default function useGameState({
  level,
  disableAutoUndo = false,
  onMove,
  isComplete
}: UseGameStateProps): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState>(initGameState(level.data));
  const oldGameState = useRef<GameState | undefined>(undefined);

  const restart = useCallback(() => {
    setGameState(prevGameState => {
      if (prevGameState.moves.length > 0) {
        oldGameState.current = cloneGameState(prevGameState);
      }

      const newGameState = initGameState(level.data);

      if (onMove) {
        onMove(newGameState);
      }

      return newGameState;
    });
  }, [level.data, onMove]);

  const makeGameMove = useCallback((direction: Direction): MoveResult => {
    let moveResult: MoveResult = { success: false, isComplete: false };

    setGameState(prevGameState => {
      // Don't allow moves if game is already complete
      if (isComplete(prevGameState)) {
        return prevGameState;
      }

      const newGameState = cloneGameState(prevGameState);

      if (makeMove(newGameState, direction, !disableAutoUndo)) {
        moveResult = {
          success: true,
          isComplete: isComplete(newGameState)
        };

        if (onMove) {
          onMove(newGameState);
        }

        return newGameState;
      }

      return prevGameState;
    });

    return moveResult;
  }, [disableAutoUndo, onMove, isComplete]);

  const undoMove = useCallback((): boolean => {
    let undoSuccessful = false;

    setGameState(prevGameState => {
      const newGameState = cloneGameState(prevGameState);

      // If no moves to undo, try to restore old game state
      if (newGameState.moves.length === 0) {
        if (oldGameState.current && oldGameState.current.moves.length > 0) {
          const clonedOldGameState = cloneGameState(oldGameState.current);

          oldGameState.current = undefined;
          undoSuccessful = true;

          if (onMove) {
            onMove(clonedOldGameState);
          }

          return clonedOldGameState;
        }

        return prevGameState;
      }

      if (undo(newGameState)) {
        undoSuccessful = true;

        if (onMove) {
          onMove(newGameState);
        }

        return newGameState;
      }

      return prevGameState;
    });

    return undoSuccessful;
  }, [onMove]);

  const redoMove = useCallback((): boolean => {
    let redoSuccessful = false;

    setGameState(prevGameState => {
      if (prevGameState.redoStack.length === 0) {
        return prevGameState;
      }

      const newGameState = cloneGameState(prevGameState);
      const direction = newGameState.redoStack[newGameState.redoStack.length - 1];

      if (makeMove(newGameState, direction, !disableAutoUndo)) {
        redoSuccessful = true;

        if (onMove) {
          onMove(newGameState);
        }

        return newGameState;
      }

      return prevGameState;
    });

    return redoSuccessful;
  }, [disableAutoUndo, onMove]);

  const restoreOldGameState = useCallback((): boolean => {
    if (!oldGameState.current) {
      return false;
    }

    const clonedOldGameState = cloneGameState(oldGameState.current);

    oldGameState.current = undefined;
    setGameState(clonedOldGameState);

    if (onMove) {
      onMove(clonedOldGameState);
    }

    return true;
  }, [onMove]);

  const cloneCurrentGameState = useCallback(() => {
    return cloneGameState(gameState);
  }, [gameState]);

  return {
    gameState,
    setGameState,
    oldGameState,
    restart,
    makeGameMove,
    undoMove,
    redoMove,
    restoreOldGameState,
    cloneCurrentGameState,
  };
}
