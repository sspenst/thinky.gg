import { getDirectionFromCode } from '@root/constants/direction';
import { GameContext } from '@root/contexts/gameContext';
import { directionsToGameState, isValidDirections } from '@root/helpers/checkpointHelpers';
import { areEqualGameStates, cloneGameState, GameState, makeMove, undo } from '@root/helpers/gameStateHelpers';
import isPro from '@root/helpers/isPro';
import useCheckpoints, { BEST_CHECKPOINT_INDEX } from '@root/hooks/useCheckpoints';
import useGameControls from '@root/hooks/useGameControls';
import useGameState from '@root/hooks/useGameState';
import useGameStats from '@root/hooks/useGameStats';
import useKeyboardControls from '@root/hooks/useKeyboardControls';
import useSessionCheckpoint from '@root/hooks/useSessionCheckpoint';
import useTouchControls from '@root/hooks/useTouchControls';
import Image from 'next/image';
import Link from 'next/link';
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import { LevelContext } from '../../contexts/levelContext';
import { PageContext } from '../../contexts/pageContext';
import Control from '../../models/control';
import Level, { EnrichedLevel } from '../../models/db/level';
import GameLayout from './gameLayout';

export interface GameProps {
  disableAutoUndo?: boolean;
  disableCheckpoints?: boolean;
  disablePlayAttempts?: boolean;
  disableStats?: boolean;
  enableSessionCheckpoint?: boolean;
  extraControls?: Control[];
  level: Level;
  matchId?: string;
  onComplete?: () => void;
  onMove?: (gameState: GameState) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onSolve?: () => void;
  onStatsSuccess?: () => void;
  disableScrubber?: boolean;
  nextLevel?: EnrichedLevel;
  prevLevel?: EnrichedLevel;
}

export default function GameRefactored({
  disableAutoUndo,
  disableCheckpoints,
  disablePlayAttempts,
  disableStats,
  enableSessionCheckpoint,
  extraControls,
  level,
  matchId,
  onComplete,
  onMove,
  onNext,
  onPrev,
  onSolve,
  onStatsSuccess,
  disableScrubber,
  nextLevel,
  prevLevel,
}: GameProps) {
  const levelContext = useContext(LevelContext);
  const { game, deviceInfo, mutateUser, shouldAttemptAuth, user } = useContext(AppContext);
  const isComplete = game.isComplete;
  const { preventKeyDownEvent } = useContext(PageContext);

  // Derived values
  const pro = isPro(user);
  const isMobile = deviceInfo.isMobile;

  // Refs for keyboard state
  const shiftKeyDown = useRef(false);

  // Context mutations
  const mutateCollection = levelContext?.mutateCollection;
  const mutateLevel = levelContext?.mutateLevel;
  const mutateProStatsLevel = levelContext?.mutateProStatsLevel;
  const mutateReviews = levelContext?.mutateReviews;

  // Checkpoints management
  const { checkpoints, mutateCheckpoints } = useCheckpoints(
    level._id,
    disableCheckpoints || user === null || !pro
  );

  // Game state management
  const {
    gameState,
    setGameState,
    oldGameState,
    restart,
    makeGameMove,
    undoMove,
    redoMove,
  } = useGameState({
    level,
    disableAutoUndo,
    isComplete,
    onMove: (newGameState) => {
      // Handle session checkpoint
      if (enableSessionCheckpoint) {
        saveSessionToSessionStorage(newGameState);
      }

      // Track stats if level is completed
      if (isComplete(newGameState)) {
        if (onComplete) {
          onComplete();
        }

        if (newGameState.moves.length <= level.leastMoves && onSolve) {
          onSolve();
        }

        // Track stats upon completion
        trackStats(newGameState.moves.map(move => move.direction), 3);
      }

      // Call user's onMove callback
      if (onMove) {
        onMove(newGameState);
      }
    },
  });

  // Session checkpoint management
  const { saveSessionToSessionStorage, restoreSessionCheckpoint } = useSessionCheckpoint({
    levelId: level._id,
    levelData: level.data,
    enabled: enableSessionCheckpoint,
  });

  // Stats tracking
  const { trackStats, fetchPlayAttempt } = useGameStats({
    levelId: level._id.toString(),
    matchId,
    disableStats,
    disablePlayAttempts,
    shouldAttemptAuth,
    onStatsSuccess,
    mutateUser,
    mutateCheckpoints,
    mutateCollection,
    mutateLevel,
    mutateProStatsLevel,
    mutateReviews,
  });

  // Checkpoint operations
  const saveCheckpoint = useCallback((index: number) => {
    if (index !== BEST_CHECKPOINT_INDEX) {
      toast.dismiss();
      toast.loading(`Saving checkpoint ${index}...`);
    }

    fetch('/api/level/' + level._id + '/checkpoints', {
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
  }, [gameState, level._id, mutateCheckpoints]);

  const deleteCheckpoint = useCallback((index: number) => {
    if (index !== BEST_CHECKPOINT_INDEX) {
      toast.dismiss();
      toast.loading(`Deleting checkpoint ${index}...`);
    }

    fetch(`/api/level/${level._id}/checkpoints?index=${index}`, {
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
  }, [level._id, mutateCheckpoints]);

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

    const checkpointGameState = directionsToGameState(checkpoint, level.data);

    if (!checkpointGameState) {
      toast.dismiss();
      toast.error('Invalid checkpoint');

      return;
    }

    if (!areEqualGameStates(checkpointGameState, gameState)) {
      oldGameState.current = cloneGameState(gameState);
      setGameState(checkpointGameState);

      toast.dismiss();
      toast.success(
        <div>
          {index === BEST_CHECKPOINT_INDEX ?
            'Restored your best completion. Press B again to '
            :
            `Restored checkpoint ${index}. Press ${index} again to `
          }
          <span
            className='text-blue-400'
            style={{ cursor: 'pointer' }}
            onClick={() => {
              loadCheckpoint(index);
              toast.dismiss();
            }}
          >
            undo
          </span>
        </div>,
        { duration: 3000 },
      );
    } else if (oldGameState.current) {
      setGameState(cloneGameState(oldGameState.current));
      oldGameState.current = undefined;
      toast.dismiss();
      toast.error('Undoing checkpoint restore', { duration: 1500, icon: '👍' });
    }
  }, [checkpoints, gameState, level.data, setGameState, oldGameState]);

  // Create refs for frequently changing values to avoid recreating handleKeyDown
  const gameStateRef = useRef(gameState);
  const isCompleteRef = useRef(isComplete);
  const fetchPlayAttemptRef = useRef(fetchPlayAttempt);
  const makeGameMoveRef = useRef(makeGameMove);
  const restartRef = useRef(restart);
  const undoMoveRef = useRef(undoMove);
  const redoMoveRef = useRef(redoMove);
  const saveCheckpointRef = useRef(saveCheckpoint);
  const loadCheckpointRef = useRef(loadCheckpoint);

  // Update refs when values change
  useEffect(() => {
    gameStateRef.current = gameState;
    isCompleteRef.current = isComplete;
    fetchPlayAttemptRef.current = fetchPlayAttempt;
    makeGameMoveRef.current = makeGameMove;
    restartRef.current = restart;
    undoMoveRef.current = undoMove;
    redoMoveRef.current = redoMove;
    saveCheckpointRef.current = saveCheckpoint;
    loadCheckpointRef.current = loadCheckpoint;
  }, [gameState, isComplete, fetchPlayAttempt, makeGameMove, restart, undoMove, redoMove, saveCheckpoint, loadCheckpoint]);

  // Main keyboard handler - stable function that doesn't depend on frequently changing values
  const handleKeyDown = useCallback((code: string): boolean => {
    // Navigation controls
    if (code === 'KeyN' && onNext) {
      onNext();

      return false;
    }

    if (code === 'KeyP' && onPrev) {
      onPrev();

      return false;
    }

    // Checkpoint controls
    if (code.startsWith('Digit') || code === 'KeyB') {
      if (disableCheckpoints) return false;

      if (!pro) {
        toast.dismiss();
        toast.error(
          <div>Upgrade to <Link href='/pro' className='text-blue-500'>{game.displayName} Pro</Link> to unlock checkpoints!</div>,
          {
            duration: 3000,
            icon: <Image alt='pro' src='/pro.svg' width='16' height='16' />,
          }
        );

        return false;
      }

      if (code.startsWith('Digit')) {
        const index = parseInt(code.replace('Digit', ''));
        const isShiftHeld = shiftKeyDown.current;

        if (isShiftHeld) {
          saveCheckpointRef.current(index);
        } else {
          loadCheckpointRef.current(index);
        }
      } else {
        loadCheckpointRef.current(BEST_CHECKPOINT_INDEX);
      }

      return false;
    }

    // Game movement controls
    if (code === 'KeyR') {
      restartRef.current();

      return false;
    }

    const undoKey = code === 'Backspace' || code === 'KeyU' || code === 'KeyZ';
    const redoKey = undoKey || code === 'KeyY';

    if (undoKey && !shiftKeyDown.current) {
      undoMoveRef.current();

      return false;
    }

    if (redoKey && !pro) {
      toast.dismiss();
      toast.error(
        <div>Upgrade to <Link href='/pro' className='text-blue-500'>{game.displayName} Pro</Link> to unlock redo!</div>,
        {
          duration: 3000,
          icon: <Image alt='pro' src='/pro.svg' width='16' height='16' />,
        }
      );

      return false;
    }

    const currentGameState = gameStateRef.current;
    const direction = redoKey ?
      (currentGameState.redoStack.length > 0 ? currentGameState.redoStack[currentGameState.redoStack.length - 1] : null) :
      getDirectionFromCode(code);

    if (!direction) return false;

    // Lock movement once complete
    if (isCompleteRef.current(currentGameState)) return false;

    const moveResult = redoKey ?
      { success: redoMoveRef.current(), isComplete: false } : // redo doesn't return completion info yet
      makeGameMoveRef.current(direction);

    if (moveResult.success && !disablePlayAttempts) {
      // Track play attempts upon making a successful move
      fetchPlayAttemptRef.current();
    }

    // Return true if the game became complete after this move, false otherwise
    return moveResult.isComplete;
  }, [
    onNext, onPrev, disableCheckpoints, pro, game.displayName, disablePlayAttempts
  ]);

  // Handle touch-to-keyboard mapping
  const handleTouchMove = useCallback((dx: number, dy: number): boolean => {
    const code = Math.abs(dx) > Math.abs(dy) ?
      (dx < 0 ? 'ArrowLeft' : 'ArrowRight') :
      (dy < 0 ? 'ArrowUp' : 'ArrowDown');

    return handleKeyDown(code);
  }, [handleKeyDown]);

  // Keyboard controls hook
  useKeyboardControls({
    onKeyDown: handleKeyDown,
    preventKeyDownEvent,
    shiftKeyDown,
  });

  // Touch controls hook
  const { isSwiping, resetTouchState } = useTouchControls({
    levelId: level._id,
    levelWidth: level.width,
    levelHeight: level.height,
    onMove: handleTouchMove,
    preventKeyDownEvent,
  });

  // UI controls hook
  const { controls } = useGameControls({
    gameState,
    isMobile,
    isPro: pro,
    onKeyDown: handleKeyDown,
    onNext,
    onPrev,
    extraControls,
  });

  // Cell click handler
  const onCellClick = useCallback((x: number, y: number) => {
    if (isSwiping.current) return;

    const playerPosition = gameState.pos;
    const dist = Math.abs(x - playerPosition.x + y - playerPosition.y);

    // Only move if on same row or column
    if (x !== playerPosition.x && y !== playerPosition.y) return;

    let breaker = 0;

    while (breaker < dist) {
      const gameCompleted = handleTouchMove(x - playerPosition.x, y - playerPosition.y);

      resetTouchState(); // Reset touch state to prevent conflicts (matching original behavior)
      breaker++;

      // Stop at exit if game became complete (matching original behavior)
      if (gameCompleted) {
        break;
      }
    }
  }, [gameState.pos, handleTouchMove, isSwiping, resetTouchState]);

  // Scrubber handler
  const handleScrub = useCallback((moveIndex: number) => {
    setGameState(prevGameState => {
      const newGameState = cloneGameState(prevGameState);

      // Reset to initial state
      while (newGameState.moves.length > 0) {
        undo(newGameState);
      }

      // Apply moves up to moveIndex
      for (let i = 0; i < moveIndex; i++) {
        if (newGameState.redoStack.length > 0) {
          const direction = newGameState.redoStack[newGameState.redoStack.length - 1];

          makeMove(newGameState, direction, false);
        }
      }

      return newGameState;
    });
  }, [setGameState]);

  // Restore session checkpoint on mount
  useEffect(() => {
    if (enableSessionCheckpoint) {
      const restoredGameState = restoreSessionCheckpoint();

      if (restoredGameState) {
        setGameState(restoredGameState);
      }
    }
  }, [enableSessionCheckpoint, restoreSessionCheckpoint, setGameState]);

  return (
    <GameContext.Provider value={{
      checkpoints: checkpoints,
      deleteCheckpoint: deleteCheckpoint,
      level: level,
      loadCheckpoint: loadCheckpoint,
      saveCheckpoint: saveCheckpoint,
    }}>
      <GameLayout
        controls={controls}
        disableCheckpoints={disableCheckpoints}
        gameState={gameState}
        level={level}
        onCellClick={onCellClick}
        onScrub={disableScrubber ? undefined : handleScrub}
        isPro={pro}
        nextLevel={nextLevel}
        prevLevel={prevLevel}
      />
      <div>[testing 0.1]</div>
    </GameContext.Provider>
  );
}
