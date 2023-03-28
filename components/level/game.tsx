import isPro from '@root/helpers/isPro';
import { isValidGameState } from '@root/helpers/isValidGameState';
import useCheckpoints from '@root/hooks/useCheckpoints';
import { Types } from 'mongoose';
import Link from 'next/link';
import NProgress from 'nprogress';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { throttle } from 'throttle-debounce';
import LevelDataType from '../../constants/levelDataType';
import { AppContext } from '../../contexts/appContext';
import { LevelContext } from '../../contexts/levelContext';
import { PageContext } from '../../contexts/pageContext';
import BlockState from '../../models/blockState';
import Control from '../../models/control';
import Level from '../../models/db/level';
import Move from '../../models/move';
import Position, { getDirectionFromCode } from '../../models/position';
import SquareState from '../../models/squareState';
import GameLayout from './gameLayout';

export interface GameState {
  actionCount: number;
  blocks: BlockState[];
  board: SquareState[][];
  height: number;
  moveCount: number;
  moves: Move[];
  pos: Position;
  width: number;
}

interface GameStateStorage {
  _id: Types.ObjectId;
  gameState: GameState;
}

interface GameProps {
  allowFreeUndo?: boolean;
  disablePlayAttempts?: boolean;
  disableStats?: boolean;
  enableLocalSessionRestore?: boolean;
  disableCheckpoints?: boolean;
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

function cloneGameState(state: GameState) {
  return {
    actionCount: state.actionCount,
    blocks: state.blocks.map(block => BlockState.clone(block)),
    board: state.board.map(row => {
      return row.map(square => SquareState.clone(square));
    }),
    height: state.height,
    moveCount: state.moveCount,
    moves: state.moves.map(move => Move.clone(move)),
    pos: new Position(state.pos.x, state.pos.y),
    width: state.width,
  };
}

function initGameState(levelData: string, actionCount = 0) {
  const blocks: BlockState[] = [];
  const data = levelData.split('\n');
  const height = data.length;
  const width = data[0].length;
  const board = Array(height).fill(undefined).map(() =>
    new Array(width).fill(undefined).map(() =>
      new SquareState()));
  let blockId = 0;
  let pos = new Position(0, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const levelDataType = data[y][x];

      if (levelDataType === LevelDataType.Wall ||
        levelDataType === LevelDataType.End ||
        levelDataType === LevelDataType.Hole) {
        board[y][x].levelDataType = levelDataType;
      } else if (levelDataType === LevelDataType.Start) {
        pos = new Position(x, y);
      } else if (LevelDataType.canMove(levelDataType)) {
        blocks.push(new BlockState(blockId++, levelDataType, x, y));
      }
    }
  }

  return {
    actionCount: actionCount,
    blocks: blocks,
    board: board,
    height: height,
    moveCount: 0,
    moves: [],
    pos: pos,
    width: width,
  } as GameState;
}

export default function Game({
  allowFreeUndo,
  disableCheckpoints,
  disablePlayAttempts,
  disableStats,
  enableLocalSessionRestore,
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
  const [gameState, setGameState] = useState<GameState>(initGameState(level.data));
  const [lastCodes, setLastCodes] = useState<string[]>([]);
  const levelContext = useContext(LevelContext);
  const [localSessionRestored, setLocalSessionRestored] = useState(false);
  const mutateLevel = levelContext?.mutateLevel;
  const { user, mutateUser, shouldAttemptAuth } = useContext(AppContext);
  const oldGameState = useRef<GameState>();
  const { preventKeyDownEvent } = useContext(PageContext);
  const [shiftKeyDown, setShiftKeyDown] = useState(false);
  const { checkpoints, mutateCheckpoints } = useCheckpoints(level._id, disableCheckpoints || user === null || !isPro(user));

  useEffect(() => {
    if (enableLocalSessionRestore && !localSessionRestored && typeof window.sessionStorage !== 'undefined') {
      const levelSessionStorage = window.sessionStorage.getItem('level');

      if (levelSessionStorage) {
        const gameStateStorage = JSON.parse(levelSessionStorage) as GameStateStorage;

        if (gameStateStorage._id === level._id && gameStateStorage.gameState) {
          const gameStateLocal = cloneGameState(gameStateStorage.gameState);

          setGameState(prevGameState => {
            // Compare local game state with server game state
            const isEqual = prevGameState.board.length === gameStateLocal.board.length &&
              prevGameState.height === gameStateLocal.height &&
              prevGameState.width === gameStateLocal.width &&
              prevGameState.blocks.every((serverBlock, i) => {
                const localBlock = gameStateLocal.blocks[i];

                return serverBlock.type === localBlock.type;
              });

            if (isEqual) {
              setLocalSessionRestored(true);

              return gameStateLocal;
            } else {
              // this happens... super weird... but at least we catch it now
              return prevGameState;
            }
          });
        }
      }
    }
  }, [enableLocalSessionRestore, level._id, level.ts, localSessionRestored]);

  useEffect(() => {
    if (gameState.actionCount > 0) {
      if (onMove) {
        onMove(gameState);
      }

      if (enableLocalSessionRestore && typeof window.sessionStorage !== 'undefined') {
        window.sessionStorage.setItem('level', JSON.stringify({
          _id: level._id,
          gameState: gameState,
        } as GameStateStorage));
      }
    }
  }, [enableLocalSessionRestore, gameState, level._id, level.ts, onMove]);

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

  useEffect(() => {
    if (disablePlayAttempts || gameState.actionCount === 0) {
      return;
    }

    fetchPlayAttempt();
  }, [disablePlayAttempts, fetchPlayAttempt, gameState.actionCount]);

  const trackStats = useCallback((codes: string[], levelId: string, maxRetries: number) => {
    if (disableStats) {
      return;
    }

    // if codes array is identical to lastCodes array, don't PUT stats
    if (codes.length === lastCodes.length && codes.every((code, index) => code === lastCodes[index])) {
      return;
    }

    NProgress.start();

    fetch('/api/stats', {
      method: 'PUT',
      body: JSON.stringify({
        codes: codes,
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

        if (onStatsSuccess) {
          onStatsSuccess();
        }

        setLastCodes(codes);
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

      console.error(`Error updating stats: { codes: ${codes}, levelId: ${levelId} }`, error);
      toast.dismiss();
      toast.error(`Error updating stats: ${error}`, { duration: 3000 });

      if (maxRetries > 0) {
        trackStats(codes, levelId, maxRetries - 1);
      }
    }).finally(() => {
      NProgress.done();
    });
  }, [disableStats, lastCodes, matchId, mutateLevel, mutateUser, onStatsSuccess]);

  const handleKeyDown = useCallback(async (code: string) => {
    // check if code is the shift key
    if (code.startsWith('Shift')) {
      setShiftKeyDown(true);
    }

    // check if code starts with the words Digit
    if (code.startsWith('Digit')) {
      if (isPro(user)) {
        toast.dismiss();
        const digit = code.replace('Digit', '');

        // keep digit a string so we can use it as an index for checkpoints which stores the numbers as strings
        if (!disableCheckpoints) {
          if (shiftKeyDown) {
            toast.loading('Saving checkpoint...', { duration: 1000 });
            const resp = await fetch('/api/level/' + level._id + '/checkpoints', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                checkpointIndex: parseInt(digit),
                checkpointValue: gameState
              }),
            });
            const response = await resp.json();

            if (!resp.ok) {
              toast.error(response?.error || 'Unknown error occured', { duration: 1000 });
            } else {
              mutateCheckpoints();
            }
          } else if (checkpoints) {
            const checkpoint = checkpoints[parseInt(digit, 10)];

            if (checkpoint) {
              const checkpointGameStateCloned = cloneGameState(checkpoint);

              if (!isValidGameState(checkpointGameStateCloned)) {
                toast.error('Corrupted checkpoint', { duration: 1000 });

                return;
              } else {
              // check if the checkpoint is the same as the current game state
                if (JSON.stringify(checkpointGameStateCloned) === JSON.stringify(gameState) && JSON.stringify(gameState) !== JSON.stringify(oldGameState.current)) {
                  toast.error('Undoing checkpoint restore', { duration: 1500, icon: '👍'
                  });
                  oldGameState.current && setGameState(oldGameState.current);
                } else {
                  oldGameState.current = gameState;
                  setGameState(checkpointGameStateCloned);
                  const keepOldStateRef = cloneGameState(oldGameState.current);

                  toast.success(<div>{'Restored checkpoint ' + digit + '. Press ' + digit + ' again to '}<span className='text-blue-400' style={{ cursor: 'pointer' }} onClick={() => {
                    setGameState(keepOldStateRef);
                    toast.dismiss();
                  }}>undo</span></div>, { duration: 3000 });
                }
              }
            } else {
            // nothing to restore
            }
          } else {
            toast.error('No checkpoints to restore', { duration: 1000 });
          }
        }
      } else {
        toast.error(
          <div className='flex flex-col text-lg'>
            <div>Upgrade to <Link href='/settings/proaccount' className='text-blue-500'>Pathology Pro</Link> to unlock checkpoints!</div>
          </div>,
          {
            duration: 5000,
            icon: '🔒',
          }
        );
      }
    }

    // boundary checks
    function isPositionValid(
      height: number,
      pos: Position,
      width: number,
    ) {
      return pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height;
    }

    // can the player move to this position
    function isPlayerPositionValid(
      board: SquareState[][],
      height: number,
      pos: Position,
      width: number,
    ) {
      return isPositionValid(height, pos, width) && board[pos.y][pos.x].levelDataType !== LevelDataType.Wall &&
        board[pos.y][pos.x].levelDataType !== LevelDataType.Hole;
    }

    // can a block move to this position
    function isBlockPositionValid(
      board: SquareState[][],
      blocks: BlockState[],
      height: number,
      pos: Position,
      width: number,
    ) {
      return isPositionValid(height, pos, width) && board[pos.y][pos.x].levelDataType !== LevelDataType.Wall &&
        !isBlockAtPosition(blocks, pos);
    }

    function getBlockById(blocks: BlockState[], id: number) {
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].id === id) {
          return blocks[i];
        }
      }

      return undefined;
    }

    function getBlockIndexAtPosition(blocks: BlockState[], pos: Position) {
      for (let i = 0; i < blocks.length; i++) {
        // ignore blocks in hole
        if (blocks[i].inHole) {
          continue;
        }

        if (blocks[i].pos.equals(pos)) {
          return i;
        }
      }

      return -1;
    }

    function isBlockAtPosition(blocks: BlockState[], pos: Position) {
      return getBlockIndexAtPosition(blocks, pos) !== -1;
    }

    setGameState(prevGameState => {
      function getNewGameState() {
        // restart
        if (code === 'KeyR') {
          if (prevGameState.moveCount > 0) {
            oldGameState.current = cloneGameState(prevGameState);
          }

          return initGameState(level.data, prevGameState.actionCount + 1);
        }

        // treat prevGameState as immutable
        const blocks = prevGameState.blocks.map(block => block.clone());
        const board = prevGameState.board.map(row => {
          return row.map(square => square.clone());
        });
        const moves = prevGameState.moves.map(move => move.clone());

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

          // remove text only from the current position for smoother animations
          const text = board[prevGameState.pos.y][prevGameState.pos.x].text;

          // the text may not exist since it is only added when moving away from a position
          if (text[text.length - 1] === prevGameState.moveCount) {
            text.pop();
          }

          if (prevMove.block) {
            const block = getBlockById(blocks, prevMove.block.id);

            if (block) {
              block.pos = prevMove.block.pos.clone();

              if (block.inHole) {
                block.inHole = false;

                if (prevMove.holePos !== undefined) {
                  board[prevMove.holePos.y][prevMove.holePos.x].levelDataType = LevelDataType.Hole;
                }
              }
            }
          }

          return {
            actionCount: prevGameState.actionCount + 1,
            blocks: blocks,
            board: board,
            height: prevGameState.height,
            moveCount: prevGameState.moveCount - 1,
            moves: moves,
            pos: prevMove.pos.clone(),
            width: prevGameState.width,
          };
        }

        function makeMove(direction: Position) {
          // if the position didn't change or the new position is invalid
          if (!isPlayerPositionValid(board, prevGameState.height, pos, prevGameState.width)) {
            return prevGameState;
          }

          const blockIndex = getBlockIndexAtPosition(blocks, pos);
          const move = new Move(code, prevGameState.pos);

          // if there is a block at the new position
          if (blockIndex !== -1) {
            const block = blocks[blockIndex];
            const blockPos = block.pos.add(direction);

            // if the block is not allowed to move this direction or the new position is invalid
            if (!block.canMoveTo(blockPos) ||
              !isBlockPositionValid(board, blocks, prevGameState.height, blockPos, prevGameState.width)) {
              return prevGameState;
            }

            move.block = block.clone();
            block.pos = blockPos;

            // remove block if it is pushed onto a hole
            if (board[blockPos.y][blockPos.x].levelDataType === LevelDataType.Hole) {
              block.inHole = true;
              board[blockPos.y][blockPos.x].levelDataType = LevelDataType.Default;
              move.holePos = blockPos.clone();
            }
          }

          const text = board[prevGameState.pos.y][prevGameState.pos.x].text;

          // save text if it doesn't already exist (may exist due to undo)
          if (text[text.length - 1] !== prevGameState.moveCount) {
            text.push(prevGameState.moveCount);
          }

          // save history from this move
          moves.push(move);

          const moveCount = prevGameState.moveCount + 1;

          if (board[pos.y][pos.x].levelDataType === LevelDataType.End) {
            trackStats(moves.map(move => move.code), level._id.toString(), 3);
          }

          return {
            actionCount: prevGameState.actionCount + 1,
            blocks: blocks,
            board: board,
            height: prevGameState.height,
            moveCount: moveCount,
            moves: moves,
            pos: pos,
            width: prevGameState.width,
          };
        }

        // if explicitly asked to undo, undo
        if (code === 'Backspace' || code === 'KeyU' || code == 'KeyZ') {
          return undo();
        }

        const direction = getDirectionFromCode(code);

        // return if no valid direction was pressed
        if (!direction) {
          return prevGameState;
        }

        // calculate the target tile to move to
        const pos = prevGameState.pos.add(direction);

        // before making a move, check if undo is a better choice
        function checkForFreeUndo() {
          if (moves.length === 0) {
            return false;
          }

          // logic for valid free undo:
          //  if the board state has not changed and you're backtracking
          const lastMove = moves[moves.length - 1];

          return pos.equals(lastMove.pos) && !lastMove.block;
        }

        if (allowFreeUndo && checkForFreeUndo()) {
          return undo();
        }

        // lock movement once you reach the finish
        if (prevGameState.board[prevGameState.pos.y][prevGameState.pos.x].levelDataType === LevelDataType.End) {
          return prevGameState;
        }

        // if not, just make the move normally
        return makeMove(direction);
      }

      const newGameState = getNewGameState();

      if (newGameState.board[newGameState.pos.y][newGameState.pos.x].levelDataType === LevelDataType.End &&
        newGameState.moves.length <= level.leastMoves && onComplete) {
        onComplete();
      }

      return newGameState;
    });
  }, [allowFreeUndo, checkpoints, disableCheckpoints, gameState, level._id, level.data, level.leastMoves, mutateCheckpoints, onComplete, shiftKeyDown, trackStats, user]);

  const touchXDown = useRef<number>(0);
  const touchYDown = useRef<number>(0);
  const validTouchStart = useRef<boolean>(false);
  const [lastTouchTimestamp, setLastTouchTimestamp] = useState<number>(Date.now());
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
      setShiftKeyDown(false);
    }
  }, []);

  const handleBlurEvent = useCallback(() => {
    setShiftKeyDown(false);
  }, []);

  const handleTouchStartEvent = useCallback((event: TouchEvent) => {
    if (preventKeyDownEvent) {
      return;
    }

    // NB: must start the touch event within the game layout
    const isValid = event.composedPath().some(e => (e as HTMLElement).id === 'grid');

    validTouchStart.current = isValid;

    if (isValid) {
      // store the mouse x and y position
      touchXDown.current = event.touches[0].clientX;
      touchYDown.current = event.touches[0].clientY;
      isSwiping.current = false;
      const ts = Date.now();

      setLastTouchTimestamp(ts);
      event.preventDefault();
    }
  }, [preventKeyDownEvent]);

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

    const timeSince = Date.now() - lastTouchTimestamp;

    if (timeSince > 500) {
      isSwiping.current = false;
    }

    if (!isSwiping.current && touchXDown !== undefined && touchYDown !== undefined ) {
      const { clientX, clientY } = event.changedTouches[0];
      const dx: number = clientX - touchXDown.current;
      const dy: number = clientY - touchYDown.current;
      const containerDiv = document.getElementById('grid');

      const maxHeight = containerDiv?.offsetHeight || 0;
      const maxWidth = containerDiv?.offsetWidth || 0;
      const squareSize = gameState.width / gameState.height > maxWidth / maxHeight ?
        Math.floor(maxWidth / gameState.width) : Math.floor(maxHeight / gameState.height);

      const squareMargin = Math.round(squareSize / 40) || 1;

      // drag distance
      const dragDistance = Math.sqrt(dx * dx + dy * dy);

      if (dragDistance / timeSince > 0.3) {
        // if the user drags really fast and it was sudden, don't move on drag because it is likely a swipe
        touchXDown.current = clientX;
        touchYDown.current = clientY;
        isSwiping.current = true;

        return;
      }

      if (Math.abs(dx) < squareSize + squareMargin && Math.abs(dy) < squareSize + squareMargin) {
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
  }, [gameState.height, gameState.width, lastTouchTimestamp, moveByDXDY, preventKeyDownEvent]);

  const handleTouchEndEvent = useCallback((event: TouchEvent) => {
    if (!validTouchStart.current || preventKeyDownEvent) {
      return;
    }

    const timeSince = Date.now() - lastTouchTimestamp;

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
  }, [lastTouchTimestamp, moveByDXDY, preventKeyDownEvent, touchXDown, touchYDown]);

  useEffect(() => {
    window.addEventListener('blur', handleBlurEvent);
    document.addEventListener('keydown', handleKeyDownEvent);
    document.addEventListener('keyup', handleKeyUpEvent);
    document.addEventListener('touchstart', handleTouchStartEvent);
    document.addEventListener('touchmove', handleTouchMoveEvent);
    document.addEventListener('touchend', handleTouchEndEvent);

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
      _controls.push(new Control('btn-prev', () => onPrev(), <>Prev Level</>));
    }

    _controls.push(
      new Control('btn-restart', () => handleKeyDown('KeyR'), <><span className='underline'>R</span>estart</>),
      new Control('btn-undo', () => handleKeyDown('Backspace'), <><span className='underline'>U</span>ndo</>, false, false, () => {
        handleKeyDown('Backspace');

        return true;
      }),
    );

    if (onNext) {
      _controls.push(new Control('btn-next', () => onNext(), <>Next Level</>));
    }

    if (extraControls) {
      setControls(_controls.concat(extraControls));
    } else {
      setControls(_controls);
    }
  }, [extraControls, gameState.moveCount, handleKeyDown, onNext, onPrev, setControls]);

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
    <GameLayout
      checkpoints={checkpoints}
      controls={controls}
      gameState={gameState}
      hideSidebar={hideSidebar}
      level={level}
      matchId={matchId}
      onCellClick={(x, y) => onCellClick(x, y)}
    />
  );
}
