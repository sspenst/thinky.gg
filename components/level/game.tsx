import Direction, { directionToVector, getDirectionFromCode } from '@root/constants/direction';
import { GameContext } from '@root/contexts/gameContext';
import { directionsToGameState, isValidDirections } from '@root/helpers/checkpointHelpers';
import { cloneGameState, cloneMove, cloneTileState, GameState, initGameState, makeMove } from '@root/helpers/gameStateHelpers';
import isPro from '@root/helpers/isPro';
import useCheckpoints, { BEST_CHECKPOINT_INDEX } from '@root/hooks/useCheckpoints';
import { Types } from 'mongoose';
import Image from 'next/image';
import Link from 'next/link';
import NProgress from 'nprogress';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { throttle } from 'throttle-debounce';
import TileType from '../../constants/tileType';
import { AppContext } from '../../contexts/appContext';
import { LevelContext } from '../../contexts/levelContext';
import { PageContext } from '../../contexts/pageContext';
import Control from '../../models/control';
import Level, { EnrichedLevel } from '../../models/db/level';
import GameLayout from './gameLayout';

interface SessionCheckpoint {
  _id: Types.ObjectId;
  directions: Direction[];
}

interface GameProps {
  allowFreeUndo?: boolean;
  disableCheckpoints?: boolean;
  disablePlayAttempts?: boolean;
  disableStats?: boolean;
  enableSessionCheckpoint?: boolean;
  extraControls?: Control[];
  hideSidebar?: boolean;
  level: Level;
  matchId?: string;
  onComplete?: () => void;
  onMove?: (gameState: GameState) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onStatsSuccess?: () => void;
}

export default function Game({
  allowFreeUndo,
  disableCheckpoints,
  disablePlayAttempts,
  disableStats,
  enableSessionCheckpoint,
  extraControls,
  hideSidebar,
  level,
  matchId,
  onComplete,
  onMove,
  onNext,
  onPrev,
  onStatsSuccess,
}: GameProps) {
  const levelContext = useContext(LevelContext);
  const { mutateUser, shouldAttemptAuth, user } = useContext(AppContext);
  const { preventKeyDownEvent } = useContext(PageContext);
  const mutateLevel = levelContext?.mutateLevel;
  const mutateProStatsLevel = levelContext?.mutateProStatsLevel;

  const [gameState, setGameState] = useState<GameState>(initGameState(level.data));
  const [redoMoves, setRedoMoves] = useState<GameState[]>([]);

  const lastDirections = useRef<Direction[]>([]);
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
  }, [disableStats, matchId, mutateLevel, mutateProStatsLevel, mutateUser, onStatsSuccess]);

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

    const newGameState = directionsToGameState(checkpoint, level.data);

    if (!newGameState) {
      toast.dismiss();
      toast.error('Invalid checkpoint');

      return;
    }

    // check if the checkpoint is the same as the current game state
    if (JSON.stringify(newGameState) === JSON.stringify(gameState) && JSON.stringify(gameState) !== JSON.stringify(oldGameState.current)) {
      toast.dismiss();
      toast.error('Undoing checkpoint restore', { duration: 1500, icon: '👍' });
      oldGameState.current && setGameState(oldGameState.current);
    } else {
      oldGameState.current = gameState;
      // TODO: https://github.com/sspenst/pathology/issues/910
      // should reapply the checkpoint rather than just cloning the state
      // so that in the editor checkpoints can be properly loaded even when the level content changes
      setGameState(newGameState);
      const keepOldStateRef = cloneGameState(oldGameState.current);

      toast.dismiss();

      toast.success(
        <div>
          {index === BEST_CHECKPOINT_INDEX ?
            'Restored your best solve. Press B again to '
            :
            `Restored checkpoint ${index}. Press ${index} again to `
          }
          <span
            className='text-blue-400'
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setGameState(keepOldStateRef);
              toast.dismiss();
            }}
          >
            undo
          </span>
        </div>,
        { duration: 3000 },
      );
    }

    return;
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
        toast.dismiss();
        toast.error(
          <div>Upgrade to <Link href='/settings/proaccount' className='text-blue-500'>Pathology Pro</Link> to unlock checkpoints!</div>,
          {
            duration: 5000,
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
      function getNewGameState() {
        if (!disablePlayAttempts) {
          fetchPlayAttempt();
        }

        // restart
        if (code === 'KeyR') {
          if (prevGameState.moves.length > 0) {
            oldGameState.current = cloneGameState(prevGameState);
          }

          return initGameState(level.data);
        }

        // treat prevGameState as immutable
        const board = prevGameState.board.map(row => {
          return row.map(tileState => cloneTileState(tileState));
        });
        const moves = prevGameState.moves.map(move => cloneMove(move));

        // undo
        function undo() {
          const prevMove = moves.pop();

          // nothing to undo
          if (prevMove === undefined) {
            let returnState = undefined;

            if (oldGameState.current) {
              returnState = cloneGameState(oldGameState.current);
              oldGameState.current = undefined;
            }

            return returnState || prevGameState;
          }

          redoMoves.push(cloneGameState(prevGameState));

          // remove text only from the current position for smoother animations
          const text = board[prevGameState.pos.y][prevGameState.pos.x].text;

          // the text may not exist since it is only added when moving away from a position
          if (text[text.length - 1] === prevGameState.moves.length) {
            text.pop();
          }

          // undo the block push
          if (prevMove.blockId !== undefined) {
            const blockPos = prevGameState.pos.add(directionToVector(prevMove.direction));
            const tileStateAtBlock = board[blockPos.y][blockPos.x];

            if (tileStateAtBlock.block?.id === prevMove.blockId) {
              board[prevGameState.pos.y][prevGameState.pos.x].block = tileStateAtBlock.block;
              tileStateAtBlock.block = undefined;
            } else if (tileStateAtBlock.blockInHole?.id === prevMove.blockId) {
              board[prevGameState.pos.y][prevGameState.pos.x].block = tileStateAtBlock.blockInHole;
              tileStateAtBlock.blockInHole = undefined;
              tileStateAtBlock.tileType = TileType.Hole;
            } else {
              // unexpected - block not found
              return prevGameState;
            }
          }

          const newGameState: GameState = {
            board: board,
            moves: moves,
            pos: prevGameState.pos.sub(directionToVector(prevMove.direction)),
          };

          return newGameState;
        }

        const undoKey = code === 'Backspace' || code === 'KeyU' || code == 'KeyZ';

        if (undoKey && !shiftKeyDown.current) {
          return undo();
        }

        // redo
        if (undoKey || code === 'KeyY') {
          if (!pro) {
            toast.dismiss();
            toast.error(
              <div>Upgrade to <Link href='/settings/proaccount' className='text-blue-500'>Pathology Pro</Link> to unlock redo!</div>,
              {
                duration: 5000,
                icon: <Image alt='pro' src='/pro.svg' width='16' height='16' />,
              }
            );

            return prevGameState;
          }

          return redoMoves.pop() ?? prevGameState;
        }

        const direction = getDirectionFromCode(code);

        // return if no valid direction was pressed
        if (!direction) {
          return prevGameState;
        }

        // calculate the target tile to move to
        const pos = prevGameState.pos.add(directionToVector(direction));

        // before making a move, check if undo is a better choice
        function checkForFreeUndo() {
          if (!allowFreeUndo || moves.length === 0) {
            return false;
          }

          // logic for valid free undo:
          // if the board state has not changed and you're backtracking
          const lastMove = moves[moves.length - 1];

          // no free undo if you moved a block
          if (lastMove.blockId !== undefined) {
            return false;
          }

          // free undo if you are going back to the same position
          return prevGameState.pos.sub(directionToVector(lastMove.direction)).equals(pos);
        }

        if (checkForFreeUndo()) {
          return undo();
        }

        const newGameState = cloneGameState(prevGameState);
        const validMove = makeMove(newGameState, direction);

        if (!validMove) {
          return prevGameState;
        }

        setRedoMoves([]);

        if (enableSessionCheckpoint && typeof window.sessionStorage !== 'undefined') {
          window.sessionStorage.setItem('sessionCheckpoint', JSON.stringify({
            _id: level._id,
            directions: newGameState.moves.map(move => move.direction),
          } as SessionCheckpoint));
        }

        if (newGameState.board[newGameState.pos.y][newGameState.pos.x].tileType === TileType.End) {
          trackStats(newGameState.moves.map(move => move.direction), level._id.toString(), 3);
        }

        return newGameState;
      }

      const newGameState = getNewGameState();

      if (onMove) {
        onMove(newGameState);
      }

      return newGameState;
    });
  }, [allowFreeUndo, disableCheckpoints, disablePlayAttempts, enableSessionCheckpoint, fetchPlayAttempt, level._id, level.data, loadCheckpoint, onMove, onNext, onPrev, pro, redoMoves, saveCheckpoint, trackStats]);

  useEffect(() => {
    const atEnd = gameState.board[gameState.pos.y][gameState.pos.x].tileType === TileType.End;

    if (atEnd && gameState.moves.length <= level.leastMoves && onComplete) {
      onComplete();
    }
  }, [gameState, level.leastMoves, onComplete]);

  useEffect(() => {
    if (disableCheckpoints || !pro || !checkpoints) {
      return;
    }

    const atEnd = gameState.board[gameState.pos.y][gameState.pos.x].tileType === TileType.End;
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
  }, [checkpoints, disableCheckpoints, enrichedLevel.userMoves, gameState, pro, saveCheckpoint]);

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

      if (Math.abs(dx) < tileSize + tileMargin && Math.abs(dy) < tileSize + tileMargin) {
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

  useEffect(() => {
    const _controls: Control[] = [];

    if (onPrev) {
      _controls.push(new Control('btn-prev', () => onPrev(), <><span className='underline'>P</span>rev Level</>));
    }

    _controls.push(
      new Control('btn-restart', () => handleKeyDown('KeyR'), <><span className='underline'>R</span>estart</>),
      new Control('btn-undo', () => handleKeyDown('Backspace'), <><span className='underline'>U</span>ndo</>, false, false, () => {
        handleKeyDown('Backspace');

        return true;
      }),
      new Control(
        'btn-redo',
        () => handleKeyDown('KeyY'),
        <span className='flex gap-2 justify-center'>
          <Image alt='pro' src='/pro.svg' width='16' height='16' />
          {'Redo'}
        </span>,
        redoMoves.length === 0,
        false,
        () => {
          handleKeyDown('KeyY');

          return true;
        },
      ),
    );

    if (onNext) {
      _controls.push(new Control('btn-next', () => onNext(), <><span className='underline'>N</span>ext Level</>));
    }

    if (extraControls) {
      setControls(_controls.concat(extraControls));
    } else {
      setControls(_controls);
    }
  }, [extraControls, gameState.moves.length, handleKeyDown, onNext, onPrev, pro, redoMoves.length, setControls]);

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
        hideSidebar={hideSidebar}
        level={level}
        matchId={matchId}
        onCellClick={(x, y) => onCellClick(x, y)}
      />
    </GameContext.Provider>
  );
}
