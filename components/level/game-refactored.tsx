import Direction, { directionToVector, getDirectionFromCode } from '@root/constants/direction';
import TileType from '@root/constants/tileType';
import { GameContext } from '@root/contexts/gameContext';
import { cloneGameState, GameState, makeMove, undo } from '@root/helpers/gameStateHelpers';
import isPro from '@root/helpers/isPro';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import useCheckpointAPI from '@root/hooks/useCheckpointAPI';
import useCheckpoints, { BEST_CHECKPOINT_INDEX } from '@root/hooks/useCheckpoints';
import useGameControls from '@root/hooks/useGameControls';
import useGameKeyboardControls from '@root/hooks/useGameKeyboardControls';
import useGameState from '@root/hooks/useGameState';
import useGameStats from '@root/hooks/useGameStats';
import useSessionCheckpoint from '@root/hooks/useSessionCheckpoint';
import useTouchControls from '@root/hooks/useTouchControls';
import Position from '@root/models/position';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useContext, useEffect, useRef } from 'react';
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

  // Checkpoint API operations
  const { saveCheckpoint, deleteCheckpoint, loadCheckpoint } = useCheckpointAPI({
    levelId: level._id,
    levelData: level.data,
    gameState,
    setGameState,
    oldGameState,
    checkpoints,
    mutateCheckpoints,
  });

  // Create refs for frequently changing values to avoid recreating handleKeyDown
  const gameStateRef = useRef(gameState);
  const isCompleteRef = useRef(isComplete);
  const fetchPlayAttemptRef = useRef(fetchPlayAttempt);
  const makeGameMoveRef = useRef(makeGameMove);
  const restartRef = useRef(restart);
  const undoMoveRef = useRef(undoMove);
  const redoMoveRef = useRef(redoMove);

  // Update refs when values change
  useEffect(() => {
    gameStateRef.current = gameState;
    isCompleteRef.current = isComplete;
    fetchPlayAttemptRef.current = fetchPlayAttempt;
    makeGameMoveRef.current = makeGameMove;
    restartRef.current = restart;
    undoMoveRef.current = undoMove;
    redoMoveRef.current = redoMove;
  }, [gameState, isComplete, fetchPlayAttempt, makeGameMove, restart, undoMove, redoMove]);

  // Keyboard controls hook - needs to be defined before handleKeyDown
  const handleKeyDownRef = useRef<(code: string) => void>(() => {});
  const { shiftKeyDown } = useGameKeyboardControls({
    onKeyDown: (code) => handleKeyDownRef.current(code),
    preventKeyDownEvent,
  });

  // Function to handle shift + direction movement
  const handleShiftDirection = useCallback((direction: Direction) => {
    const currentGameState = gameStateRef.current;
    const playerPos = currentGameState.pos;
    const directionVector = directionToVector(direction);

    // Check if the first move would push a block
    const firstMovePos = playerPos.add(directionVector);

    // Check if first move is within bounds
    if (firstMovePos.y < 0 || firstMovePos.y >= currentGameState.board.length ||
        firstMovePos.x < 0 || firstMovePos.x >= currentGameState.board[firstMovePos.y].length) {
      return playerPos; // Can't move, return current position
    }

    const firstMoveTile = currentGameState.board[firstMovePos.y][firstMovePos.x];
    const blockAtFirstMove = firstMoveTile.block;

    // No block to push, use original logic - find target cell by traversing until hitting non-empty square
    let targetPos = new Position(playerPos.x, playerPos.y);

    // Keep moving in the direction until we hit a non-empty square or boundary
    while (true) {
      const nextPos = targetPos.add(directionVector);

      // Check if next position is within bounds
      if (nextPos.y < 0 || nextPos.y >= currentGameState.board.length ||
          nextPos.x < 0 || nextPos.x >= currentGameState.board[nextPos.y].length) {
        break;
      }

      const nextTile = currentGameState.board[nextPos.y][nextPos.x];

      // Check if next tile is non-empty
      const hasBlock = nextTile.block !== undefined;
      const isWall = nextTile.tileType === TileType.Wall;
      const isHole = nextTile.tileType === TileType.Hole;
      const isExit = nextTile.tileType === TileType.Exit;

      // If next tile is non-empty (except exits which can be entered), stop here
      if (hasBlock || isWall || isHole) {
        if (!(blockAtFirstMove && TileTypeHelper.canMoveInDirection(blockAtFirstMove.tileType, direction))) {
          break;
        }
      }

      // Move to next position
      targetPos = nextPos;

      // If we reach an exit, we can stop here (exits are valid targets)
      if (isExit) {
        break;
      }
    }

    return targetPos;
  }, []);

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
          saveCheckpoint(index);
        } else {
          loadCheckpoint(index);
        }
      } else {
        loadCheckpoint(BEST_CHECKPOINT_INDEX);
      }

      return false;
    }

    // Get direction from code for both regular movement and shift+direction
    const direction = getDirectionFromCode(code);

    // Handle shift + direction for "travel as far as possible"
    if (direction && shiftKeyDown.current) {
      const currentGameState = gameStateRef.current;
      const playerPos = currentGameState.pos;
      const targetPos = handleShiftDirection(direction);

      // Only move if we found a different position than current
      if (!targetPos.equals(playerPos)) {
        // Simulate the click by moving step by step in the direction
        const dist = Math.abs(targetPos.x - playerPos.x + targetPos.y - playerPos.y);

        // Only move if on same row or column
        if (targetPos.x === playerPos.x || targetPos.y === playerPos.y) {
          const dx = targetPos.x - playerPos.x;
          const dy = targetPos.y - playerPos.y;

          for (let i = 0; i < dist; i++) {
            const moveDirection = Math.abs(dx) > Math.abs(dy) ?
              (dx < 0 ? Direction.LEFT : Direction.RIGHT) :
              (dy < 0 ? Direction.UP : Direction.DOWN);

            // Make the move directly without going through handleKeyDown to avoid recursion
            const currentState = gameStateRef.current;

            if (isCompleteRef.current(currentState)) {
              break;
            }

            const moveResult = makeGameMoveRef.current(moveDirection);

            if (moveResult.success && !disablePlayAttempts) {
              fetchPlayAttemptRef.current();
            }

            if (moveResult.isComplete) {
              break;
            }
          }
        }
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
    const moveDirection = redoKey ?
      (currentGameState.redoStack.length > 0 ? currentGameState.redoStack[currentGameState.redoStack.length - 1] : null) :
      direction;

    if (!moveDirection) return false;

    // Lock movement once complete
    if (isCompleteRef.current(currentGameState)) return false;

    const moveResult = redoKey ?
      { success: redoMoveRef.current(), isComplete: false } : // redo doesn't return completion info yet
      makeGameMoveRef.current(moveDirection);

    if (moveResult.success && !disablePlayAttempts) {
      // Track play attempts upon making a successful move
      fetchPlayAttemptRef.current();
    }

    // Return true if the game became complete after this move, false otherwise
    return moveResult.isComplete;
  }, [onNext, onPrev, pro, disablePlayAttempts, disableCheckpoints, game.displayName, saveCheckpoint, loadCheckpoint, handleShiftDirection, shiftKeyDown]);

  // Update the keyboard handler ref
  useEffect(() => {
    handleKeyDownRef.current = handleKeyDown;
  }, [handleKeyDown]);

  // Handle touch-to-keyboard mapping
  const handleTouchMove = useCallback((dx: number, dy: number): boolean => {
    const code = Math.abs(dx) > Math.abs(dy) ?
      (dx < 0 ? 'ArrowLeft' : 'ArrowRight') :
      (dy < 0 ? 'ArrowUp' : 'ArrowDown');

    return handleKeyDown(code);
  }, [handleKeyDown]);

  // Keyboard controls hook moved above handleKeyDown definition

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
    </GameContext.Provider>
  );
}
