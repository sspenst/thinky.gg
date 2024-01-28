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
import { dropConfetti } from '../page/Confetti';
import GameLayout from './gameLayout';

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
}

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
}: GameProps) {
  const levelContext = useContext(LevelContext);
  const { game, deviceInfo, mutateUser, shouldAttemptAuth, user } = useContext(AppContext);
  const isComplete = game.isComplete;
  const { preventKeyDownEvent } = useContext(PageContext);

  const mutateCollection = levelContext?.mutateCollection;
  const mutateLevel = levelContext?.mutateLevel;
  const mutateProStatsLevel = levelContext?.mutateProStatsLevel;

  const [gameState, setGameState] = useState<GameState>(initGameState(level.data));

  const lastDirections = useRef<Direction[]>([]);
  // keeping track of the game state before restarting or loading a checkpoint
  const oldGameState = useRef<GameState>();
  const sessionCheckpointRestored = useRef(false);
  const shiftKeyDown = useRef(false);

  const { checkpoints, mutateCheckpoints } = useCheckpoints(level._id, disableCheckpoints || user === null || !isPro(user));
  const enrichedLevel = level as EnrichedLevel;
  const pro = isPro(user);

  useEffect(() => {
    if (!enableSessionCheckpoint || sessionCheckpointRestored.current || typeof window.sessionStorage === 'undefined') {
      return;
    }

    const sessionCheckpointStr = window.sessionStorage.getItem('sessionCheckpoint');

    if (!sessionCheckpointStr) {
      return;
    }

    const sessionCheckpoint = JSON.parse(sessionCheckpointStr) as SessionCheckpoint;

    if (sessionCheckpoint._id !== level._id || !isValidDirections(sessionCheckpoint.directions)) {
      return;
    }

    const newGameState = directionsToGameState(sessionCheckpoint.directions, level.data);

    if (!newGameState) {
      return;
    }

    setGameState(newGameState);
  }, [enableSessionCheckpoint, level._id, level.data]);

  const SECOND = 1000;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchPlayAttempt = useCallback(throttle(15 * SECOND, async () => {
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

  const trackStats = useCallback((directions: Direction[], levelId: string, maxRetries: number) => {
    if (disableStats) {
      return;
    }

    // if directions array is identical to lastDirections array, don't PUT stats
    if (directions.length === lastDirections.current.length && directions.every((direction, index) => direction === lastDirections.current[index])) {
      return;
    }

    NProgress.start();

    fetch('/api/stats', {
      method: 'PUT',
      body: JSON.stringify({
        directions: directions,
        levelId: levelId,
        matchId: matchId,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async res => {
      if (res.status === 200) {
        mutateUser();

        if (mutateCollection) {
          mutateCollection();
        }

        if (mutateLevel) {
          mutateLevel();
        }

        if (mutateProStatsLevel) {
          mutateProStatsLevel();
        }

        if (onStatsSuccess) {
          onStatsSuccess();
        }

        lastDirections.current = directions;
      } else if (res.status === 500) {
        throw res.text();
      } else {
        // NB: don't retry if we get a 400 or 404 response since the request is already invalid
        const error = JSON.parse(await res.text())?.error;

        toast.dismiss();
        toast.error(`Error updating stats: ${error}`, { duration: 3000 });
      }
    }).catch(async err => {
      const error = JSON.parse(await err)?.error;

      console.error(`Error updating stats: { directions: ${directions}, levelId: ${levelId} }`, error);
      toast.dismiss();
      toast.error(`Error updating stats: ${error}`, { duration: 3000 });

      if (maxRetries > 0) {
        trackStats(directions, levelId, maxRetries - 1);
      }
    }).finally(() => {
      NProgress.done();
    });
  }, [disableStats, matchId, mutateCollection, mutateLevel, mutateProStatsLevel, mutateUser, onStatsSuccess]);

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saveSessionToSessionStorage = useCallback(debounce(100, (gs: GameState) => {
    if (typeof window.sessionStorage === 'undefined') {
      return;
    }

    window.sessionStorage.setItem('sessionCheckpoint', JSON.stringify({
      _id: level._id,
      directions: gs.moves.map(move => move.direction),
    } as SessionCheckpoint));
  }), [level._id]);

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
        toast.dismiss();
        toast.error(
          <div>Upgrade to <Link href='/settings/pro' className='text-blue-500'>{game.displayName} Pro</Link> to unlock checkpoints!</div>,
          {
            duration: 3000,
            icon: <Image alt='pro' src='/pro.svg' width='16' height='16' />,
          }
        );

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
          if (!oldGameState.current) {
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
        toast.dismiss();
        toast.error(
          <div>Upgrade to <Link href='/settings/pro' className='text-blue-500'>{game.displayName} Pro</Link> to unlock redo!</div>,
          {
            duration: 3000,
            icon: <Image alt='pro' src='/pro.svg' width='16' height='16' />,
          }
        );

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
        trackStats(newGameState.moves.map(move => move.direction), level._id.toString(), 3);
      } else if (!disablePlayAttempts) {
        // track play attempts upon making a successful move
        fetchPlayAttempt();
      }

      return onSuccessfulMove(newGameState);
    });
  }, [disableAutoUndo, disableCheckpoints, disablePlayAttempts, enableSessionCheckpoint, fetchPlayAttempt, game.displayName, isComplete, level._id, level.data, level.leastMoves, loadCheckpoint, onComplete, onMove, onNext, onPrev, onSolve, pro, saveCheckpoint, saveSessionToSessionStorage, trackStats]);

  useEffect(() => {
    if (disableCheckpoints || !pro || !checkpoints) {
      return;
    }

    const atEnd = isComplete(gameState);

    const bestCheckpoint = checkpoints[BEST_CHECKPOINT_INDEX];

    function newBest() {
      if (!bestCheckpoint) {
        return true;
      }

      return gameState.moves.length < bestCheckpoint.length;
    }

    if (atEnd && newBest()) {
      saveCheckpoint(BEST_CHECKPOINT_INDEX);
    }
  }, [checkpoints, disableCheckpoints, enrichedLevel.userMoves, gameState, isComplete, pro, saveCheckpoint]);

  const touchXDown = useRef<number>(0);
  const touchYDown = useRef<number>(0);
  const validTouchStart = useRef<boolean>(false);
  const lastTouchTimestamp = useRef<number>(Date.now());
  const lastMovetimestamp = useRef(Date.now());
  const isSwiping = useRef<boolean>(false);
  const handleKeyDownEvent = useCallback((event: KeyboardEvent) => {
    if (preventKeyDownEvent) {
      return;
    }

    const { code } = event;

    // prevent arrow keys from scrolling the sidebar
    if (code === 'ArrowUp' || code === 'ArrowDown') {
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

  const handleTouchStartEvent = useCallback((event: TouchEvent) => {
    if (preventKeyDownEvent) {
      return;
    }

    // NB: must start the touch event within the game layout
    const isValid = event.composedPath().some(e => (e as HTMLElement).id === `grid-${level._id.toString()}`);

    validTouchStart.current = isValid;

    if (isValid) {
      // store the mouse x and y position
      touchXDown.current = event.touches[0].clientX;
      touchYDown.current = event.touches[0].clientY;
      isSwiping.current = false;
      lastTouchTimestamp.current = Date.now();
      event.preventDefault();
    }
  }, [level._id, preventKeyDownEvent]);

  const moveByDXDY = useCallback((dx: number, dy: number) => {
    const timeSince = Date.now() - lastMovetimestamp.current;

    if (timeSince < 0) {
      // max move rate
      return;
    }

    lastMovetimestamp.current = Date.now();
    const code = Math.abs(dx) > Math.abs(dy) ? dx < 0 ?
      'ArrowLeft' : 'ArrowRight' : dy < 0 ? 'ArrowUp' : 'ArrowDown';

    handleKeyDown(code);
  }, [handleKeyDown, lastMovetimestamp]);

  const handleTouchMoveEvent = useCallback((event: TouchEvent) => {
    if (!validTouchStart.current || preventKeyDownEvent) {
      return;
    }

    const timeSince = Date.now() - lastTouchTimestamp.current;

    if (timeSince > 500) {
      isSwiping.current = false;
    }

    if (!isSwiping.current && touchXDown !== undefined && touchYDown !== undefined ) {
      const { clientX, clientY } = event.changedTouches[0];
      const dx: number = clientX - touchXDown.current;
      const dy: number = clientY - touchYDown.current;
      const containerDiv = document.getElementById(`grid-${level._id.toString()}`);

      const maxHeight = containerDiv?.offsetHeight || 0;
      const maxWidth = containerDiv?.offsetWidth || 0;
      const tileSize = level.width / level.height > maxWidth / maxHeight ?
        Math.floor(maxWidth / level.width) : Math.floor(maxHeight / level.height);

      const tileMargin = Math.round(tileSize / 40) || 1;

      // drag distance
      const dragDistance = Math.sqrt(dx * dx + dy * dy);

      if (dragDistance / timeSince > 0.3) {
        // if the user drags really fast and it was sudden, don't move on drag because it is likely a swipe
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

      // reset x and y position
      // setTouchXDown(undefined);
      // setTouchYDown(undefined);
    }
  }, [level._id, level.height, level.width, moveByDXDY, preventKeyDownEvent]);

  const handleTouchEndEvent = useCallback((event: TouchEvent) => {
    if (!validTouchStart.current || preventKeyDownEvent) {
      return;
    }

    const timeSince = Date.now() - lastTouchTimestamp.current;

    if (timeSince <= 500 && touchXDown !== undefined && touchYDown !== undefined) {
      // for swipe control instead of drag
      const { clientX, clientY } = event.changedTouches[0];

      const dx: number = clientX - touchXDown.current;
      const dy: number = clientY - touchYDown.current;

      if (Math.abs(dx) <= 0.5 && Math.abs(dy) <= 0.5) {
        // disable tap
        // get player
        const player = document.getElementById('player');

        if (!player) {
          return;
        }

        return;
      }

      moveByDXDY(dx, dy);
      touchXDown.current = clientX;
      touchYDown.current = clientY;
    }
  }, [moveByDXDY, preventKeyDownEvent, touchXDown, touchYDown]);

  useEffect(() => {
    window.addEventListener('blur', handleBlurEvent);
    document.addEventListener('keydown', handleKeyDownEvent);
    document.addEventListener('keyup', handleKeyUpEvent);
    // NB: even though the default value for passive is false, you have to specifically set it to false here in order to prevent swipe navigation in the browser
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

  const [controls, setControls] = useState<Control[]>([]);
  const screenSize = deviceInfo.screenSize;
  const isMobile = screenSize < ScreenSize.XL;

  useEffect(() => {
    const _controls: Control[] = [];

    if (onPrev) {
      const leftArrow = <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18' />
      </svg>;
      const prevTxt = isMobile ? leftArrow : <div><span className='underline'>P</span>rev Level</div>;

      _controls.push(new Control('btn-prev', () => onPrev(), prevTxt ));
    }

    const restartIcon = (<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
      <path strokeLinecap='round' strokeLinejoin='round' d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99' />
    </svg>);
    const restartTxt = isMobile ? restartIcon : <div><span className='underline'>R</span>estart</div>;

    const undoIcon = (<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
      <path strokeLinecap='round' strokeLinejoin='round' d='M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3' />
    </svg>);
    const undoTxt = isMobile ? undoIcon : <div><span className='underline'>U</span>ndo</div>;

    const redoIcon = (<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
      <path strokeLinecap='round' strokeLinejoin='round' d='M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3' />
    </svg>);

    const redoTxt = isMobile ? redoIcon : <div>Redo (<span className='underline'>Y</span>)</div>;

    _controls.push(
      new Control('btn-restart', () => handleKeyDown('KeyR'), restartTxt),
      new Control('btn-undo', () => handleKeyDown('Backspace'), undoTxt, false, false, () => {
        handleKeyDown('Backspace');

        return true;
      }),
      new Control(
        'btn-redo',
        () => handleKeyDown('KeyY'),
        <span className='flex gap-2 justify-center select-none'>
          {!pro && <Image className='pointer-events-none z-0' alt='pro' src='/pro.svg' width='16' height='16' />}
          {redoTxt}
        </span>,
        gameState.redoStack.length === 0,
        false,
        () => {
          handleKeyDown('KeyY');

          return true;
        },
      ),
    );

    if (onNext) {
      const rightArrow = <span className='truncate'><svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3' />
      </svg></span>;
      const nextTxt = isMobile ? rightArrow : <div><span className='underline'>N</span>ext Level</div>;

      _controls.push(new Control('btn-next', () => onNext(), nextTxt));
    }

    if (extraControls) {
      setControls(_controls.concat(extraControls));
    } else {
      setControls(_controls);
    }
  }, [extraControls, gameState.redoStack.length, handleKeyDown, isMobile, onNext, onPrev, pro, setControls]);

  function onCellClick(x: number, y: number) {
    if (isSwiping.current) {
      return;
    }

    const playerPosition = gameState.pos;

    // if the position is one away from x,y then move the player
    if (Math.abs(playerPosition.x - x) + Math.abs(playerPosition.y - y) === 1) {
      moveByDXDY(x - playerPosition.x, y - playerPosition.y);
      validTouchStart.current = false;
    }
  }

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
        onCellClick={(x, y) => onCellClick(x, y)}
      />
    </GameContext.Provider>
  );
}
