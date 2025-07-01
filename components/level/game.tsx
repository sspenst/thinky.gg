import Direction, { getDirectionFromCode } from '@root/constants/direction';
import { GameContext } from '@root/contexts/gameContext';
import { directionsToGameState, isValidDirections } from '@root/helpers/checkpointHelpers';
import { areEqualGameStates, cloneGameState, GameState, initGameState, makeMove, undo } from '@root/helpers/gameStateHelpers';
import isPro from '@root/helpers/isPro';
import useCheckpoints, { BEST_CHECKPOINT_INDEX } from '@root/hooks/useCheckpoints';
import { ScreenSize } from '@root/hooks/useDeviceCheck';
import { Types } from 'mongoose';
import Image from 'next/image';
import Link from 'next/link';
import NProgress from 'nprogress';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { debounce, throttle } from 'throttle-debounce';
import { AppContext } from '../../contexts/appContext';
import { LevelContext } from '../../contexts/levelContext';
import { PageContext } from '../../contexts/pageContext';
import Control from '../../models/control';
import Level, { EnrichedLevel } from '../../models/db/level';
import { ICON_PRO_16, ICON_REDO, ICON_UNDO } from '../icons/gameIcons';
import GameLayout from './gameLayout';

// Constants
const STATS_THROTTLE_MS = 15 * 1000; // 15 seconds
const SESSION_STORAGE_DEBOUNCE_MS = 100;
const TOAST_DURATION_MS = 3000;
const CHECKPOINT_TOAST_DURATION_MS = 1500;
const MIN_SWIPE_TIME_MS = 500;
const MAX_SWIPE_VELOCITY = 0.3;
const MIN_TOUCH_THRESHOLD = 0.5;
const TILE_MARGIN_RATIO = 40;

// Touch movement keys
const MOVEMENT_KEYS = {
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
} as const;

// Game control keys
const CONTROL_KEYS = {
  RESTART: 'KeyR',
  UNDO: ['Backspace', 'KeyU', 'KeyZ'],
  REDO: 'KeyY',
  NEXT: 'KeyN',
  PREV: 'KeyP',
  BEST_CHECKPOINT: 'KeyB',
} as const;

interface SessionCheckpoint {
  _id: Types.ObjectId;
  directions: Direction[];
}

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

// Custom hook for stats tracking
function useStatsTracking({
  disableStats,
  levelId,
  matchId,
  mutateUser,
  mutateCheckpoints,
  mutateCollection,
  mutateLevel,
  mutateProStatsLevel,
  mutateReviews,
  onStatsSuccess,
}: {
  disableStats?: boolean;
  levelId: string;
  matchId?: string;
  mutateUser: () => void;
  mutateCheckpoints: () => void;
  mutateCollection?: () => void;
  mutateLevel?: () => void;
  mutateProStatsLevel?: () => void;
  mutateReviews?: () => void;
  onStatsSuccess?: () => void;
}) {
  const lastDirections = useRef<Direction[]>([]);

  const trackStats = useCallback((directions: Direction[], maxRetries: number = 3) => {
    if (disableStats) {
      return;
    }

    // Skip if directions are identical to last tracked directions
    if (directions.length === lastDirections.current.length && 
        directions.every((direction, index) => direction === lastDirections.current[index])) {
      return;
    }

    NProgress.start();

    const requestBody = {
      directions,
      levelId,
      matchId,
    };

    fetch('/api/stats', {
      method: 'PUT',
      body: JSON.stringify(requestBody),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    })
    .then(async res => {
      if (res.status === 200) {
        // Update all relevant data
        mutateUser();
        mutateCheckpoints();
        mutateCollection?.();
        mutateLevel?.();
        mutateProStatsLevel?.();
        mutateReviews?.();
        onStatsSuccess?.();
        
        lastDirections.current = directions;
      } else if (res.status === 500) {
        throw res.text();
      } else {
        const error = JSON.parse(await res.text())?.error;
        toast.dismiss();
        toast.error(`Error updating stats: ${error}`, { duration: TOAST_DURATION_MS });
      }
    })
    .catch(async err => {
      const error = JSON.parse(await err)?.error;
      console.error(`Error updating stats: { directions: ${directions}, levelId: ${levelId} }`, error);
      
      toast.dismiss();
      toast.error(`Error updating stats: ${error}`, { duration: TOAST_DURATION_MS });

      if (maxRetries > 0) {
        trackStats(directions, maxRetries - 1);
      }
    })
    .finally(() => {
      NProgress.done();
    });
  }, [disableStats, levelId, matchId, mutateUser, mutateCheckpoints, mutateCollection, mutateLevel, mutateProStatsLevel, mutateReviews, onStatsSuccess]);

  return { trackStats };
}

// Custom hook for session checkpoint management
function useSessionCheckpoint(levelId: Types.ObjectId, levelData: string, enabled: boolean) {
  const sessionCheckpointRestored = useRef(false);

  const saveSessionToSessionStorage = useCallback(debounce(SESSION_STORAGE_DEBOUNCE_MS, (gameState: GameState) => {
    if (typeof window.sessionStorage === 'undefined') {
      return;
    }

    window.sessionStorage.setItem('sessionCheckpoint', JSON.stringify({
      _id: levelId,
      directions: gameState.moves.map(move => move.direction),
    } as SessionCheckpoint));
  }), [levelId]);

  const restoreSessionCheckpoint = useCallback((): GameState | null => {
    if (!enabled || sessionCheckpointRestored.current || typeof window.sessionStorage === 'undefined') {
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
      if (newGameState) {
        sessionCheckpointRestored.current = true;
      }

      return newGameState;
    } catch (error) {
      console.error('Error parsing session checkpoint:', error);
      return null;
    }
  }, [enabled, levelId, levelData]);

  return {
    saveSessionToSessionStorage,
    restoreSessionCheckpoint,
  };
}

// Helper functions for checkpoint management
const createCheckpointToast = (index: number, isDelete: boolean = false) => {
  const action = isDelete ? 'Deleting' : 'Saving';
  toast.dismiss();
  toast.loading(`${action} checkpoint ${index}...`);
};

const showCheckpointSuccessToast = (index: number, isDelete: boolean = false) => {
  const action = isDelete ? 'Deleted' : 'Saved';
  toast.dismiss();
  toast.success(`${action} checkpoint ${index}`);
};

const showCheckpointErrorToast = (error?: string, isDelete: boolean = false) => {
  const action = isDelete ? 'deleting' : 'saving';
  toast.dismiss();
  toast.error(error || `Error ${action} checkpoint`);
};

const createProUpgradeToast = (feature: string, gameName: string) => {
  toast.dismiss();
  toast.error(
    <div>Upgrade to <Link href='/pro' className='text-blue-500'>{gameName} Pro</Link> to unlock {feature}!</div>,
    {
      duration: TOAST_DURATION_MS,
      icon: feature === 'checkpoints' ? <Image alt='pro' src='/pro.svg' width='16' height='16' /> : ICON_PRO_16,
    }
  );
};

// Custom hook for touch handling
function useTouchHandling(
  levelId: Types.ObjectId,
  levelWidth: number,
  levelHeight: number,
  preventKeyDownEvent: boolean,
  handleKeyDown: (code: string) => void
) {
  const touchXDown = useRef<number>(0);
  const touchYDown = useRef<number>(0);
  const validTouchStart = useRef<boolean>(false);
  const lastTouchTimestamp = useRef<number>(Date.now());
  const lastMovetimestamp = useRef(Date.now());
  const isSwiping = useRef<boolean>(false);

  const moveByDXDY = useCallback((dx: number, dy: number) => {
    const timeSince = Date.now() - lastMovetimestamp.current;

    if (timeSince < 0) {
      return; // Rate limiting
    }

    lastMovetimestamp.current = Date.now();
    const code = Math.abs(dx) > Math.abs(dy) 
      ? (dx < 0 ? MOVEMENT_KEYS.LEFT : MOVEMENT_KEYS.RIGHT)
      : (dy < 0 ? MOVEMENT_KEYS.UP : MOVEMENT_KEYS.DOWN);

    handleKeyDown(code);
  }, [handleKeyDown]);

  const handleTouchStartEvent = useCallback((event: TouchEvent) => {
    if (preventKeyDownEvent) {
      return;
    }

    // Must start the touch event within the game layout
    const isValid = event.composedPath().some(e => (e as HTMLElement).id === `grid-${levelId.toString()}`);
    validTouchStart.current = isValid;

    if (isValid) {
      touchXDown.current = event.touches[0].clientX;
      touchYDown.current = event.touches[0].clientY;
      isSwiping.current = false;
      lastTouchTimestamp.current = Date.now();
      event.preventDefault();
    }
  }, [levelId, preventKeyDownEvent]);

  const handleTouchMoveEvent = useCallback((event: TouchEvent) => {
    if (!validTouchStart.current || preventKeyDownEvent) {
      return;
    }

    const timeSince = Date.now() - lastTouchTimestamp.current;

    if (timeSince > MIN_SWIPE_TIME_MS) {
      isSwiping.current = false;
    }

    if (!isSwiping.current && touchXDown.current !== undefined && touchYDown.current !== undefined) {
      const { clientX, clientY } = event.changedTouches[0];
      const dx = clientX - touchXDown.current;
      const dy = clientY - touchYDown.current;
      const containerDiv = document.getElementById(`grid-${levelId.toString()}`);

      const maxHeight = containerDiv?.offsetHeight || 0;
      const maxWidth = containerDiv?.offsetWidth || 0;
      const tileSize = levelWidth / levelHeight > maxWidth / maxHeight
        ? Math.floor(maxWidth / levelWidth) 
        : Math.floor(maxHeight / levelHeight);

      const tileMargin = Math.round(tileSize / TILE_MARGIN_RATIO) || 1;
      const dragDistance = Math.sqrt(dx * dx + dy * dy);

      if (dragDistance / timeSince > MAX_SWIPE_VELOCITY) {
        // Fast drag detected - likely a swipe, don't move on drag
        touchXDown.current = clientX;
        touchYDown.current = clientY;
        isSwiping.current = true;
        return;
      }

      if (Math.abs(dx) < tileSize - tileMargin && Math.abs(dy) < tileSize - tileMargin) {
        return;
      }

      if (timeSince > 0) {
        touchXDown.current = clientX;
        touchYDown.current = clientY;
        moveByDXDY(dx, dy);
      }
    }
  }, [levelId, levelHeight, levelWidth, moveByDXDY, preventKeyDownEvent]);

  const handleTouchEndEvent = useCallback((event: TouchEvent) => {
    if (!validTouchStart.current || preventKeyDownEvent) {
      return;
    }

    const timeSince = Date.now() - lastTouchTimestamp.current;

    if (timeSince <= MIN_SWIPE_TIME_MS && touchXDown.current !== undefined && touchYDown.current !== undefined) {
      // Handle swipe gestures
      const { clientX, clientY } = event.changedTouches[0];
      const dx = clientX - touchXDown.current;
      const dy = clientY - touchYDown.current;

      if (Math.abs(dx) <= MIN_TOUCH_THRESHOLD && Math.abs(dy) <= MIN_TOUCH_THRESHOLD) {
        // Reset touch state on tap
        validTouchStart.current = false;
        return;
      }

      moveByDXDY(dx, dy);
      touchXDown.current = clientX;
      touchYDown.current = clientY;
    }

    // Reset touch state
    validTouchStart.current = false;
    isSwiping.current = false;
  }, [moveByDXDY, preventKeyDownEvent]);

  // Cleanup function for touch states
  const resetTouchStates = useCallback(() => {
    validTouchStart.current = false;
    isSwiping.current = false;
    touchXDown.current = 0;
    touchYDown.current = 0;
  }, []);

  return {
    handleTouchStartEvent,
    handleTouchMoveEvent,
    handleTouchEndEvent,
    resetTouchStates,
    moveByDXDY,
    isSwiping,
  };
}

// Helper function to create game controls (moved inside component to fix JSX context)

export default function Game({
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

  const mutateCollection = levelContext?.mutateCollection;
  const mutateLevel = levelContext?.mutateLevel;
  const mutateProStatsLevel = levelContext?.mutateProStatsLevel;
  const mutateReviews = levelContext?.mutateReviews;

  const [gameState, setGameState] = useState<GameState>(initGameState(level.data));

  // keeping track of the game state before restarting or loading a checkpoint
  const oldGameState = useRef<GameState>(undefined);
  const shiftKeyDown = useRef(false);

  const { checkpoints, mutateCheckpoints } = useCheckpoints(level._id, disableCheckpoints || user === null || !isPro(user));
  const pro = isPro(user);

  // Use the stats tracking hook
  const { trackStats } = useStatsTracking({
    disableStats,
    levelId: level._id.toString(),
    matchId,
    mutateUser,
    mutateCheckpoints,
    mutateCollection,
    mutateLevel,
    mutateProStatsLevel,
    mutateReviews,
    onStatsSuccess,
  });

  // Use the session checkpoint hook
  const { saveSessionToSessionStorage, restoreSessionCheckpoint } = useSessionCheckpoint(
    level._id,
    level.data,
    enableSessionCheckpoint || false
  );

  // Restore session checkpoint on component mount
  useEffect(() => {
    const restoredGameState = restoreSessionCheckpoint();
    if (restoredGameState) {
      setGameState(restoredGameState);
    }
  }, [restoreSessionCheckpoint]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchPlayAttempt = useCallback(throttle(STATS_THROTTLE_MS, async () => {
    if (shouldAttemptAuth) {
      await fetch('/api/play-attempt', {
        body: JSON.stringify({
          levelId: level._id,
          matchId: matchId, // TODO, add this as a tag in playAttempt so we can filter by matches
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
    }
  }), []);

  const saveCheckpoint = useCallback((index: number) => {
    if (index !== BEST_CHECKPOINT_INDEX) {
      createCheckpointToast(index);
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
          showCheckpointSuccessToast(index);
        }
        mutateCheckpoints();
      } else {
        throw res.text();
      }
    }).catch(async err => {
      console.error(err);
      if (index !== BEST_CHECKPOINT_INDEX) {
        const error = JSON.parse(await err)?.error;
        showCheckpointErrorToast(error);
      }
    });
  }, [gameState, level._id, mutateCheckpoints]);

  const deleteCheckpoint = useCallback((index: number) => {
    if (index !== BEST_CHECKPOINT_INDEX) {
      createCheckpointToast(index, true);
    }

    fetch(`/api/level/${level._id}/checkpoints?index=${index}`, {
      method: 'DELETE',
    }).then(async res => {
      if (res.status === 200) {
        if (index !== BEST_CHECKPOINT_INDEX) {
          showCheckpointSuccessToast(index, true);
        }
        mutateCheckpoints();
      } else {
        throw res.text();
      }
    }).catch(async err => {
      console.error(err);
      const error = JSON.parse(await err)?.error;
      showCheckpointErrorToast(error, true);
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
      // if the checkpoint is different than the game state, load it normally
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
      // otherwise restore the old game state if it exists
      setGameState(cloneGameState(oldGameState.current));
      oldGameState.current = undefined;

      toast.dismiss();
      toast.error('Undoing checkpoint restore', { duration: 1500, icon: '👍' });
    }
  }, [checkpoints, gameState, level.data]);

  const handleKeyDown = useCallback((code: string) => {
    if (code === 'KeyN') {
      if (onNext) {
        onNext();
      }

      return;
    }

    if (code === 'KeyP') {
      if (onPrev) {
        onPrev();
      }

      return;
    }

    // check if code is the shift key
    if (code.startsWith('Shift')) {
      shiftKeyDown.current = true;

      return;
    }

    // check if code starts with the words Digit
    if (code.startsWith('Digit') || code === 'KeyB') {
      if (disableCheckpoints) {
        return;
      }

      if (!pro) {
        createProUpgradeToast('checkpoints', game.displayName);
        return;
      }

      if (code.startsWith('Digit')) {
        const index = parseInt(code.replace('Digit', ''));

        if (shiftKeyDown.current) {
          saveCheckpoint(index);
        } else {
          loadCheckpoint(index);
        }
      } else {
        loadCheckpoint(BEST_CHECKPOINT_INDEX);
      }

      return;
    }

    setGameState(prevGameState => {
      function onSuccessfulMove(gameState: GameState) {
        // keep track of gameState in session storage
        if (enableSessionCheckpoint && typeof window.sessionStorage !== 'undefined') {
          saveSessionToSessionStorage(gameState);
        }

        if (onMove) {
          onMove(gameState);
        }

        return gameState;
      }

      // restart
      if (code === 'KeyR') {
        if (prevGameState.moves.length > 0) {
          oldGameState.current = cloneGameState(prevGameState);
        }

        return onSuccessfulMove(initGameState(level.data));
      }

      const newGameState = cloneGameState(prevGameState);

      const undoKey = code === 'Backspace' || code === 'KeyU' || code == 'KeyZ';

      if (undoKey && !shiftKeyDown.current) {
        // nothing to undo, restore the old game state if it exists
        if (newGameState.moves.length === 0) {
          if (!oldGameState.current || oldGameState.current.moves.length === 0) {
            return prevGameState;
          }

          const clonedOldGameState = cloneGameState(oldGameState.current);

          oldGameState.current = undefined;

          return onSuccessfulMove(clonedOldGameState);
        }

        if (!undo(newGameState)) {
          return prevGameState;
        }

        return onSuccessfulMove(newGameState);
      }

      const redo = undoKey || code === 'KeyY';

      if (redo && !pro) {
        createProUpgradeToast('redo', game.displayName);
        return prevGameState;
      }

      const direction = redo ? newGameState.redoStack[newGameState.redoStack.length - 1] : getDirectionFromCode(code);

      // return if no valid direction was pressed
      if (!direction) {
        return prevGameState;
      }

      // lock movement once you reach the finish
      if (isComplete(newGameState)) {
        return prevGameState;
      }

      if (!makeMove(newGameState, direction, !disableAutoUndo)) {
        return prevGameState;
      }

      if (isComplete(newGameState)) {
        if (onComplete) {
          onComplete();
        }

        if (newGameState.moves.length <= level.leastMoves && onSolve) {
          onSolve();
        }

        // track stats upon reaching an exit
        trackStats(newGameState.moves.map(move => move.direction));
      } else if (!disablePlayAttempts) {
        // track play attempts upon making a successful move
        fetchPlayAttempt();
      }

      return onSuccessfulMove(newGameState);
    });
  }, [disableAutoUndo, disableCheckpoints, disablePlayAttempts, enableSessionCheckpoint, fetchPlayAttempt, game.displayName, isComplete, level._id, level.data, level.leastMoves, loadCheckpoint, onComplete, onMove, onNext, onPrev, onSolve, pro, saveCheckpoint, saveSessionToSessionStorage, trackStats]);

  const { handleTouchStartEvent, handleTouchMoveEvent, handleTouchEndEvent, resetTouchStates, moveByDXDY, isSwiping } = useTouchHandling(
    level._id,
    level.width,
    level.height,
    preventKeyDownEvent,
    handleKeyDown
  );

  // Keyboard event handlers
  const handleKeyDownEvent = useCallback((event: KeyboardEvent) => {
    if (preventKeyDownEvent) {
      return;
    }

    const { code } = event;

    // Prevent arrow keys from scrolling the sidebar
    if (code === MOVEMENT_KEYS.UP || code === MOVEMENT_KEYS.DOWN) {
      event.preventDefault();
    }

    handleKeyDown(code);
  }, [handleKeyDown, preventKeyDownEvent]);

  const handleKeyUpEvent = useCallback((event: KeyboardEvent) => {
    const code = event.code;

    if (code.startsWith('Shift')) {
      shiftKeyDown.current = false;
    }
  }, []);

  const handleBlurEvent = useCallback(() => {
    shiftKeyDown.current = false;
  }, []);

  // Event listener setup
  useEffect(() => {
    window.addEventListener('blur', handleBlurEvent);
    document.addEventListener('keydown', handleKeyDownEvent);
    document.addEventListener('keyup', handleKeyUpEvent);
    document.addEventListener('touchstart', handleTouchStartEvent, { passive: false });
    document.addEventListener('touchmove', handleTouchMoveEvent, { passive: false });
    document.addEventListener('touchend', handleTouchEndEvent, { passive: false });

    return () => {
      window.removeEventListener('blur', handleBlurEvent);
      document.removeEventListener('keydown', handleKeyDownEvent);
      document.removeEventListener('keyup', handleKeyUpEvent);
      document.removeEventListener('touchstart', handleTouchStartEvent);
      document.removeEventListener('touchmove', handleTouchMoveEvent);
      document.removeEventListener('touchend', handleTouchEndEvent);
    };
  }, [handleBlurEvent, handleKeyDownEvent, handleKeyUpEvent, handleTouchMoveEvent, handleTouchStartEvent, handleTouchEndEvent]);

  // Reset touch states on unmount
  useEffect(() => {
    return () => {
      resetTouchStates();
    };
  }, [resetTouchStates]);

  const [controls, setControls] = useState<Control[]>([]);
  const isMobile = deviceInfo.isMobile;

  // Update controls when dependencies change
  useEffect(() => {
    const controls: Control[] = [];

    // Previous level control
    if (onPrev) {
      const leftArrow = (
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18' />
        </svg>
      );
      const prevTxt = isMobile ? leftArrow : <div><span className='underline'>P</span>rev Level</div>;
      controls.push(new Control('btn-prev', () => onPrev(), prevTxt));
    }

    // Restart control
    const restartIcon = (
      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99' />
      </svg>
    );
    const restartTxt = isMobile ? restartIcon : <div><span className='underline'>R</span>estart</div>;
    const undoTxt = isMobile ? ICON_UNDO : <div><span className='underline'>U</span>ndo</div>;
    const redoTxt = isMobile ? ICON_REDO : <div>Redo (<span className='underline'>Y</span>)</div>;

    controls.push(
      new Control('btn-restart', () => handleKeyDown(CONTROL_KEYS.RESTART), restartTxt),
      new Control('btn-undo', () => handleKeyDown('Backspace'), undoTxt, false, false, () => {
        handleKeyDown('Backspace');
        return true;
      }),
      new Control(
        'btn-redo',
        () => handleKeyDown(CONTROL_KEYS.REDO),
        <span className='flex gap-2 justify-center select-none'>
          {!pro && <Image className='pointer-events-none z-0' alt='pro' src='/pro.svg' width='16' height='16' />}
          {redoTxt}
        </span>,
        gameState.redoStack.length === 0,
        false,
        () => {
          handleKeyDown(CONTROL_KEYS.REDO);
          return true;
        },
      ),
    );

    // Next level control
    if (onNext) {
      const rightArrow = (
        <span className='truncate'>
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
            <path strokeLinecap='round' strokeLinejoin='round' d='M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3' />
          </svg>
        </span>
      );
      const nextTxt = isMobile ? rightArrow : <div><span className='underline'>N</span>ext Level</div>;
      controls.push(new Control('btn-next', () => onNext(), nextTxt));
    }

    const finalControls = extraControls ? controls.concat(extraControls) : controls;
    setControls(finalControls);
  }, [extraControls, gameState.redoStack.length, handleKeyDown, isMobile, onNext, onPrev, pro]);

  // Cell click handler
  const onCellClick = useCallback((x: number, y: number) => {
    if (isSwiping.current) {
      return;
    }

    const playerPosition = gameState.pos;

    // Only move if on the same row or column as the player
    if (x !== playerPosition.x && y !== playerPosition.y) {
      return;
    }

    // Move the player to the clicked cell
    const distance = Math.abs(x - playerPosition.x + y - playerPosition.y);
    let stepCount = 0;

    while (stepCount < distance) {
      moveByDXDY(x - playerPosition.x, y - playerPosition.y);
      stepCount++;
    }
  }, [gameState.pos, isSwiping, moveByDXDY]);

  // Scrub handler for timeline control
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
  }, []);

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
