import { useCallback, useContext, useEffect, useState } from 'react';
import BlockState from '../../models/blockState';
import Control from '../../models/control';
import GameLayout from './gameLayout';
import Level from '../../models/data/pathology/level';
import LevelDataType from '../../constants/levelDataType';
import Move from '../../models/move';
import { PageContext } from '../pageContext';
import Position from '../../models/position';
import React from 'react';
import SquareState from '../../models/squareState';
import SquareType from '../../enums/squareType';
import { useSWRConfig } from 'swr';

interface GameProps {
  level: Level;
}

export interface GameState {
  blocks: BlockState[];
  board: SquareState[][];
  endText: string | undefined;
  moveCount: number;
  moves: Move[];
  pos: Position;
}

export default function Game({ level }: GameProps) {
  const { mutate } = useSWRConfig();
  const { setIsLoading } = useContext(PageContext);
  const [trackingStats, setTrackingStats] = useState<boolean>();

  const initGameState = useCallback(() => {
    const blocks: BlockState[] = [];
    const board = Array(level.height).fill(undefined).map(() =>
      new Array(level.width).fill(undefined).map(() =>
        new SquareState()));
    let blockId = 0;
    let endText: string | undefined;
    let pos = new Position(0, 0);
  
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const levelDataType = level.data[y * level.width + x];

        if (levelDataType === LevelDataType.Wall) {
          board[y][x].squareType = SquareType.Wall;
        } else if (levelDataType === LevelDataType.End) {
          board[y][x].squareType = SquareType.End;
        } else if (levelDataType === LevelDataType.Hole) {
          board[y][x].squareType = SquareType.Hole;
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
      endText: endText,
      moveCount: 0,
      moves: [],
      pos: pos,
    };
  }, [level]);

  const [gameState, setGameState] = useState<GameState>(initGameState());
  const [hideControls, setHideControls] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(trackingStats);
  }, [setIsLoading, trackingStats]);

  const trackStats = useCallback((levelId: string, moves: number, maxRetries: number) => {
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
        levelId: levelId,
        moves: moves,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
    })
    .then(() => {
      // TODO: notification here?
      // revalidate stats and user
      mutate('/api/stats');
      mutate('/api/user');

      if (moves < level.leastMoves) {
        // revalidate leastMoves for level and pack pages
        mutate(`/api/level/${level._id.toString()}`);
        mutate(`/api/levelsByPackId/${level.packId.toString()}`);
      }

      setTrackingStats(false);
    })
    .catch(err => {
      console.error(`Error updating stats: { levelId: ${levelId}, moves: ${moves} }`, err);

      if (maxRetries > 0) {
        trackStats(levelId, moves, maxRetries - 1);
      } else {
        setTrackingStats(undefined);
      }
    })
    .finally(() => {
      clearTimeout(timeout);
    });
  }, [level, mutate]);

  const handleKeyDown = useCallback(code => {
    // boundary checks
    function isPositionValid(pos: Position) {
      return pos.x >= 0 && pos.x < level.width && pos.y >= 0 && pos.y < level.height;
    }

    // can the player move to this position
    function isPlayerPositionValid(board: SquareState[][], pos: Position) {
      return isPositionValid(pos) && board[pos.y][pos.x].squareType !== SquareType.Wall &&
        board[pos.y][pos.x].squareType !== SquareType.Hole;
    }

    // can a block move to this position
    function isBlockPositionValid(board: SquareState[][], blocks: BlockState[], pos: Position) {
      return isPositionValid(pos) && board[pos.y][pos.x].squareType !== SquareType.Wall &&
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
        if (blocks[i].pos.equals(pos)) {
          return i;
        }
      }

      return -1;
    }

    function isBlockAtPosition(blocks: BlockState[], pos: Position) {
      return getBlockIndexAtPosition(blocks, pos) !== -1;
    }

    function updatePositionWithKey(pos: Position, code: string) {
      const newPos = pos.clone();

      // can use arrows or wasd to move
      if (code === 'ArrowLeft' || code === 'KeyA') {
        newPos.x -= 1;
      } else if (code === 'ArrowUp' || code === 'KeyW') {
        newPos.y -= 1;
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        newPos.x += 1;
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        newPos.y += 1;
      }

      return newPos;
    }

    function updateBlockPositionWithKey(block: BlockState, code: string) {
      const pos = updatePositionWithKey(block.pos, code);
      return block.canMoveTo(pos) ? pos : block.pos;
    }

    if (code === 'KeyC') {
      setHideControls(prevHideControls => !prevHideControls);
      return;
    }

    setGameState(prevGameState => {
      // restart
      if (code === 'KeyR') {
        return initGameState();
      }

      // lock movement once you reach the finish
      if (prevGameState.board[prevGameState.pos.y][prevGameState.pos.x].squareType === SquareType.End) {
        return prevGameState;
      }

      // treat prevGameState as immutable
      const blocks = prevGameState.blocks.map(block => block.clone());
      const board = prevGameState.board.map(row => {
        return row.map(square => square.clone());
      });
      const move = new Move(prevGameState.pos);
      const moves = prevGameState.moves.map(move => move.clone());

      // undo
      if (code === 'Backspace' || code === 'KeyU') {
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

        for (let i = 0; i < prevMove.blocks.length; i++) {
          const prevBlock = prevMove.blocks[i];
          const block = getBlockById(blocks, prevBlock.id);
          
          // if the block doesn't exist it was removed by a hole
          if (block === undefined) {
            blocks.push(prevBlock.clone());

            if (prevMove.holePos !== undefined) {
              board[prevMove.holePos.y][prevMove.holePos.x].squareType = SquareType.Hole;
            }
          } else {
            block.pos = prevBlock.pos.clone();
          }
        }

        return {
          blocks: blocks,
          board: board,
          endText: prevGameState.endText,
          moveCount: prevGameState.moveCount - 1,
          moves: moves,
          pos: prevMove.pos.clone(),
        };
      }

      const pos = updatePositionWithKey(prevGameState.pos, code);

      // if the position didn't change or the new position is invalid
      if (pos.equals(prevGameState.pos) || !isPlayerPositionValid(board, pos)) {
        return prevGameState;
      }

      const blockIndex = getBlockIndexAtPosition(blocks, pos);

      // if there is a block at the new position
      if (blockIndex !== -1) {
        const block = blocks[blockIndex];
        const blockPos = updateBlockPositionWithKey(block, code);

        // if the block position didn't change or the new position is invalid
        if (blockPos.equals(block.pos) || !isBlockPositionValid(board, blocks, blockPos)) {
          return prevGameState;
        }

        move.blocks.push(block.clone());
        
        // remove block if it is pushed onto a hole
        if (board[blockPos.y][blockPos.x].squareType === SquareType.Hole) {
          blocks.splice(blockIndex, 1);
          board[blockPos.y][blockPos.x].squareType = SquareType.Default;
          move.holePos = blockPos.clone();
        } else {
          block.pos = blockPos;
        }
      }

      const text = board[prevGameState.pos.y][prevGameState.pos.x].text;

      // save text if it doesn't already exist (may exist due to undo)
      if (text[text.length - 1] !== prevGameState.moveCount) {
        text.push(prevGameState.moveCount);
      }

      // save history from this move
      moves.push(move);

      let endText = prevGameState.endText;
      const moveCount = prevGameState.moveCount + 1;

      if (board[pos.y][pos.x].squareType === SquareType.End) {
        if (moveCount <= level.leastMoves) {
          endText = String(moveCount);
        } else {
          const extraMoves = moveCount - level.leastMoves;
          endText = '+' + extraMoves;
        }

        trackStats(level._id.toString(), moveCount, 3);
      }

      return {
        blocks: blocks,
        board: board,
        endText: endText,
        moveCount: moveCount,
        moves: moves,
        pos: pos,
      };
    });
  }, [initGameState, level, trackStats]);

  const handleKeyDownEvent = useCallback(event => {
    const { code } = event;
    handleKeyDown(code);
  }, [handleKeyDown]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDownEvent);
    return () => document.removeEventListener('keydown', handleKeyDownEvent);
  }, [handleKeyDownEvent]);

  const [controls, setControls] = useState<Control[]>([]);

  useEffect(() => {
    setControls([
      new Control(() => handleKeyDown('KeyR'), 'Restart'),
      new Control(() => handleKeyDown('ArrowLeft'), 'Left'),
      new Control(() => handleKeyDown('ArrowUp'), 'Up'),
      new Control(() => handleKeyDown('ArrowDown'), 'Down'),
      new Control(() => handleKeyDown('ArrowRight'), 'Right'),
      new Control(() => handleKeyDown('Backspace'), 'Undo'),
    ]);
  }, [handleKeyDown, setControls]);

  return (
    <GameLayout
      controls={hideControls ? undefined : controls}
      gameState={gameState}
      level={level}
    />
  );
}
