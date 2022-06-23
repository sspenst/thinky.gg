import Position, { getDirectionFromCode } from '../../models/position';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import BlockState from '../../models/blockState';
import Control from '../../models/control';
import GameLayout from './gameLayout';
import Level from '../../models/db/level';
import LevelDataType from '../../constants/levelDataType';
import Move from '../../models/move';
import { PageContext } from '../../contexts/pageContext';
import SquareState from '../../models/squareState';
import useLevelBySlug from '../../hooks/useLevelBySlug';
import useStats from '../../hooks/useStats';
import useUser from '../../hooks/useUser';

interface GameProps {
  level: Level;
  onComplete?: () => void;
  onNext?: () => void;
}

export interface GameState {
  blocks: BlockState[];
  board: SquareState[][];
  height: number;
  moveCount: number;
  moves: Move[];
  pos: Position;
  width: number;
}

export default function Game({ level, onComplete, onNext }: GameProps) {
  const { isModalOpen } = useContext(PageContext);
  const { mutateLevel } = useLevelBySlug(level.slug);
  const { mutateStats } = useStats();
  const { mutateUser } = useUser();
  const { setIsLoading } = useContext(AppContext);
  const [trackingStats, setTrackingStats] = useState<boolean>();

  const initGameState: () => GameState = useCallback(() => {
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
    setIsLoading(trackingStats);
  }, [setIsLoading, trackingStats]);

  const trackStats = useCallback((codes: string[], levelId: string, maxRetries: number) => {
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
      // revalidate stats and user
      mutateStats();
      mutateUser();

      if (codes.length < level.leastMoves || level.leastMoves === 0) {
        // revalidate leastMoves for level
        mutateLevel();
      }

      if (codes.length <= level.leastMoves && onComplete) {
        onComplete();
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
  }, [level.leastMoves, mutateLevel, mutateStats, mutateUser, onComplete]);

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
        return initGameState();
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
  }, [initGameState, level, trackStats]);

  const [touchXDown, setTouchXDown] = useState<number>();
  const [touchYDown, setTouchYDown] = useState<number>();

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
      setTouchXDown(event.touches[0].clientX);
      setTouchYDown(event.touches[0].clientY);
      event.preventDefault();
    }
  }, [isModalOpen]);

  const handleTouchEndEvent = useCallback(event => {
    if (!isModalOpen && touchXDown !== undefined && touchYDown !== undefined) {
      const { clientX, clientY } = event.changedTouches[0];
      const dx: number = clientX - touchXDown;
      const dy: number = clientY - touchYDown;
      const code = Math.abs(dx) > Math.abs(dy) ? dx < 0 ?
        'ArrowLeft' : 'ArrowRight' : dy < 0 ? 'ArrowUp' : 'ArrowDown';

      handleKeyDown(code);

      // reset x and y position
      setTouchXDown(undefined);
      setTouchYDown(undefined);
    }
  }, [handleKeyDown, isModalOpen, touchXDown, touchYDown]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStartEvent, { passive: false });
    document.addEventListener('touchend', handleTouchEndEvent, { passive: false });
    document.addEventListener('keydown', handleKeyDownEvent);

    return () => {
      document.removeEventListener('keydown', handleKeyDownEvent);
      document.removeEventListener('touchstart', handleTouchStartEvent);
      document.removeEventListener('touchend', handleTouchEndEvent);
    };
  }, [handleKeyDownEvent, handleTouchEndEvent, handleTouchStartEvent]);

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
      leastMoves={level.leastMoves}
    />
  );
}
