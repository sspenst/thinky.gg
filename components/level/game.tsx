import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { throttle } from 'throttle-debounce';
import LevelDataType from '../../constants/levelDataType';
import { AppContext } from '../../contexts/appContext';
import { PageContext } from '../../contexts/pageContext';
import useUser from '../../hooks/useUser';
import BlockState from '../../models/blockState';
import Control from '../../models/control';
import Level from '../../models/db/level';
import Move from '../../models/move';
import Position, { getDirectionFromCode } from '../../models/position';
import SquareState from '../../models/squareState';
import GameLayout from './gameLayout';

interface GameProps {
  disableServer?: boolean;
  enableLocalSessionRestore?: boolean;
  level: Level;
  mutateLevel?: () => void;
  onComplete?: () => void;
  onMove?: (gameState: GameState) => void;
  onNext?: () => void;
}

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

export default function Game({
  disableServer,
  enableLocalSessionRestore,
  level,
  mutateLevel,
  onComplete,
  onMove,
  onNext,
}: GameProps) {
  const { isModalOpen } = useContext(PageContext);
  const [localSessionRestored, setLocalSessionRestored] = useState(false);
  const { mutateUser } = useUser();
  const { setIsLoading, shouldAttemptAuth } = useContext(AppContext);
  const [trackingStats, setTrackingStats] = useState<boolean>();

  const initGameState: (actionCount?: number) => GameState = useCallback((actionCount = 0) => {
    const blocks: BlockState[] = [];
    const height = level.height;
    const width = level.width;
    const board = Array(height).fill(undefined).map(() =>
      new Array(width).fill(undefined).map(() =>
        new SquareState()));
    const data = level.data.split('\n');
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
    };
  }, [level.data, level.height, level.width]);

  const [gameState, setGameState] = useState<GameState>(initGameState());

  // NB: need to reset the game state if SWR finds an updated level
  useEffect(() => {
    setGameState(initGameState());
  }, [initGameState]);

  useEffect(() => {
    if (enableLocalSessionRestore && !localSessionRestored) {
      const levelHash = level._id + '_' + level.ts;
      const str = window.sessionStorage.getItem(levelHash);

      if (str) {
        const localObj = JSON.parse(str);

        if (localObj.gameState) {
          const gameStateJSON = JSON.parse(localObj.gameState) as GameState;
          const gameStateLocal = {
            actionCount: gameStateJSON.actionCount,
            blocks: gameStateJSON.blocks.map(block => BlockState.clone(block)),
            board: gameStateJSON.board.map(row => {
              return row.map(square => SquareState.clone(square));
            }),
            height: gameStateJSON.height,
            moveCount: gameStateJSON.moveCount,
            moves: gameStateJSON.moves.map(move => Move.clone(move)),
            pos: new Position(gameStateJSON.pos.x, gameStateJSON.pos.y),
            width: gameStateJSON.width,
          };

          setGameState(prevGameState => {
            // Compare local game state with server game state
            const isEqual = prevGameState.blocks.length === gameStateLocal.blocks.length &&
              prevGameState.board.length === gameStateLocal.board.length &&
              prevGameState.height === gameStateLocal.height &&
              prevGameState.width === gameStateLocal.width &&
              prevGameState.board.every((row, y) => {
                return row.every((square, x) => {
                  return square.levelDataType === gameStateLocal.board[y][x].levelDataType;
                });
              }) &&
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
    setIsLoading(trackingStats);
  }, [setIsLoading, trackingStats]);

  useEffect(() => {
    if (gameState.actionCount > 0) {
      if (onMove) {
        onMove(gameState);
      }

      if (enableLocalSessionRestore) {
        const gameStateMarshalled = JSON.stringify(gameState);
        const levelHash = level._id + '_' + level.ts;

        window.sessionStorage.setItem(levelHash, JSON.stringify({
          'saved': Date.now(),
          'gameState': gameStateMarshalled,
        }));
      }
    }
  }, [enableLocalSessionRestore, gameState, level._id, level.ts, onMove]);

  const SECOND = 1000;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchPlayAttempt = useCallback(throttle(30 * SECOND, async () => {
    if (shouldAttemptAuth) {
      await fetch('/api/play-attempt', {
        body: JSON.stringify({
          levelId: level._id,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
    }
  }), []);

  useEffect(() => {
    if (disableServer) {
      return;
    }

    fetchPlayAttempt();
  }, [disableServer, fetchPlayAttempt, gameState.moveCount]);

  const trackStats = useCallback((codes: string[], levelId: string, maxRetries: number) => {
    if (disableServer) {
      return;
    }

    const controller = new AbortController();
    // NB: Vercel will randomly stall and take 10s to timeout:
    // https://github.com/vercel/next.js/discussions/16957#discussioncomment-2441364
    // need to retry the request in this case to ensure it completes
    // wait 4s before assuming the request will stall for 10s
    const timeout = setTimeout(() => controller.abort(), 4000);

    setTrackingStats(true);

    fetch('/api/stats', {
      method: 'PUT',
      body: JSON.stringify({
        codes: codes,
        levelId: levelId,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
    }).then(() => {
      mutateUser();

      if (mutateLevel) {
        mutateLevel();
      }

      setTrackingStats(false);
    }).catch(err => {
      console.error(`Error updating stats: { codes: ${codes}, levelId: ${levelId} }`, err);

      if (maxRetries > 0) {
        trackStats(codes, levelId, maxRetries - 1);
      } else {
        setTrackingStats(undefined);
      }
    }).finally(() => {
      clearTimeout(timeout);
    });
  }, [disableServer, mutateLevel, mutateUser]);

  useEffect(() => {
    if (gameState.board[gameState.pos.y][gameState.pos.x].levelDataType === LevelDataType.End &&
      gameState.moves.length <= level.leastMoves && onComplete) {
      onComplete();
    }
  }, [gameState, level.leastMoves, onComplete]);

  const handleKeyDown = useCallback(code => {
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
      // restart
      if (code === 'KeyR') {
        return initGameState(prevGameState.actionCount + 1);
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
          return prevGameState;
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
      if (code === 'Backspace' || code === 'KeyU') {
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

      if (checkForFreeUndo()) {
        return undo();
      }

      // lock movement once you reach the finish
      if (prevGameState.board[prevGameState.pos.y][prevGameState.pos.x].levelDataType === LevelDataType.End) {
        return prevGameState;
      }

      // if not, just make the move normally
      return makeMove(direction);
    });
  }, [initGameState, level._id, trackStats]);

  const touchXDown = useRef<number>(0);
  const touchYDown = useRef<number>(0);
  const [lastTouchTimestamp, setLastTouchTimestamp] = useState<number>(Date.now());
  const lastMovetimestamp = useRef(Date.now());
  const handleKeyDownEvent = useCallback(event => {
    if (!isModalOpen) {
      const { code } = event;

      handleKeyDown(code);
    }
  }, [handleKeyDown, isModalOpen]);

  const handleTouchStartEvent = useCallback(event => {
    // NB: this allows touch events on buttons / links to behave normally

    if (event.target.nodeName !== 'DIV') {
      return;
    }

    if (!isModalOpen) {
      // store the mouse x and y position
      touchXDown.current = event.touches[0].clientX;
      touchYDown.current = event.touches[0].clientY;
      const ts = Date.now();

      setLastTouchTimestamp(ts);
      event.preventDefault();
    }
  }, [isModalOpen]);
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
  const handleTouchMoveEvent = useCallback(event => {
    const timeSince = Date.now() - lastTouchTimestamp;

    if (!isModalOpen && touchXDown !== undefined && touchYDown !== undefined ) {
      const { clientX, clientY } = event.changedTouches[0];
      const dx: number = clientX - touchXDown.current;
      const dy: number = clientY - touchYDown.current;
      const containerDiv = document.getElementById('layout-container');

      const maxHeight = containerDiv?.offsetHeight || 0;
      const maxWidth = containerDiv?.offsetWidth || 0;
      const squareSize = gameState.width / gameState.height > maxWidth / maxHeight ?
        Math.floor(maxWidth / gameState.width) : Math.floor(maxHeight / gameState.height);

      const squareMargin = Math.round(squareSize / 40) || 1;

      if (Math.abs(dx) < squareSize + squareMargin && Math.abs(dy) < squareSize + squareMargin) {
        return;
      }

      if (timeSince > 300) {
        touchXDown.current = clientX;
        touchYDown.current = clientY;
        console.log('calling move');
        moveByDXDY(dx, dy);
      }

      // reset x and y position
      // setTouchXDown(undefined);
      // setTouchYDown(undefined);
    }
  }, [gameState.height, gameState.width, isModalOpen, lastTouchTimestamp, moveByDXDY, touchXDown, touchYDown]);
  const handleTouchEndEvent = useCallback((event) => {
    const timeSince = Date.now() - lastTouchTimestamp;

    if (timeSince <= 500 && !isModalOpen && touchXDown !== undefined && touchYDown !== undefined) {
      // for swipe control instead of drag
      const { clientX, clientY } = event.changedTouches[0];

      const dx: number = clientX - touchXDown.current;
      const dy: number = clientY - touchYDown.current;

      if (Math.abs(dx) <= 0.1 && Math.abs(dy) <= 0.1) {
        // disable tap

        return;
      }

      moveByDXDY(dx, dy);
      touchXDown.current = clientX;
      touchYDown.current = clientY;
    }
  }, [isModalOpen, lastTouchTimestamp, moveByDXDY, touchXDown, touchYDown]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStartEvent, { passive: false });
    document.addEventListener('touchmove', handleTouchMoveEvent, { passive: false });
    document.addEventListener('touchend', handleTouchEndEvent, { passive: false });
    document.addEventListener('keydown', handleKeyDownEvent, { passive: false });

    return () => {
      document.removeEventListener('keydown', handleKeyDownEvent);
      document.removeEventListener('touchstart', handleTouchStartEvent);
      document.removeEventListener('touchmove', handleTouchMoveEvent);
      document.removeEventListener('touchend', handleTouchEndEvent);
    };
  }, [handleKeyDownEvent, handleTouchMoveEvent, handleTouchStartEvent, handleTouchEndEvent]);

  const [controls, setControls] = useState<Control[]>([]);

  useEffect(() => {
    const _controls = [
      new Control('btn-restart', () => handleKeyDown('KeyR'), 'Restart'),
      new Control('btn-undo', () => handleKeyDown('Backspace'), 'Undo')
    ];

    if (onNext) {
      _controls.push(new Control('btn-next', () => onNext(), 'Next Level'));
    }

    setControls(_controls);
  }, [handleKeyDown, onNext, setControls]);

  return (
    <GameLayout
      controls={controls}
      gameState={gameState}
      level={level}
    />
  );
}
