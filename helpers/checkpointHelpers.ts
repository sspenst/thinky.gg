import { GameState } from '@root/components/level/game';
import TileType from '@root/constants/tileType';
import BlockState from '@root/models/blockState';
import Move from '@root/models/move';
import Position, { getDirectionFromCode } from '@root/models/position';
import SquareState from '@root/models/squareState';

interface CheckpointSquareState {
  levelDataType: TileType;
  text: number[];
}

interface CheckpointMove {
  code: string;
  pos: Position;
  block?: BlockState;
  holePos?: Position;
}

// NB: legacy interface to allow for refactoring the original GameState
export interface CheckpointState {
  actionCount: number;
  // TODO: CheckpointBlockState if this is refactored
  blocks: BlockState[];
  board: CheckpointSquareState[][];
  height: number;
  moveCount: number;
  moves: CheckpointMove[];
  pos: Position;
  width: number;
}

export function isValidCheckpointState(value: unknown) {
  if (typeof value !== 'object') {
    return false;
  }

  // keys that it needs are all in interface CheckpointState
  const checkpointStateKeys = ['actionCount', 'blocks', 'board', 'height', 'moveCount', 'moves', 'pos', 'width'];
  const valueKeys = Object.keys(value as { [key: string]: unknown });

  for (const key of checkpointStateKeys) {
    if (!valueKeys.includes(key)) {
      return false;
    }
  }

  // make sure there aren't any extra keys
  if (valueKeys.length !== checkpointStateKeys.length) {
    return false;
  }

  return true;
}

export function convertToCheckpointState(gameState: GameState) {
  const blocks = gameState.blocks.map(block => BlockState.clone(block));
  const checkpointState: CheckpointState = {
    actionCount: gameState.actionCount,
    blocks: blocks,
    board: gameState.board.map(row => {
      return row.map(square => {
        const checkpointSquareState: CheckpointSquareState = {
          levelDataType: square.tileType,
          text: square.text,
        };

        return checkpointSquareState;
      });
    }),
    height: gameState.height,
    moveCount: gameState.moveCount,
    moves: gameState.moves.map(move => {
      const checkpointMove: CheckpointMove = {
        code: move.code,
        pos: move.pos.clone(),
      };

      if (move.blockId !== undefined) {
        const block = blocks.find(b => b.id === move.blockId);
        const direction = getDirectionFromCode(move.code);

        if (block && direction) {
          checkpointMove.block = block.clone();
          checkpointMove.block.pos = checkpointMove.block.pos.sub(direction);

          if (block.inHole) {
            checkpointMove.block.inHole = false;
            checkpointMove.holePos = block.pos.clone();
          }
        }
      }

      return checkpointMove;
    }),
    pos: new Position(gameState.pos.x, gameState.pos.y),
    width: gameState.width,
  };

  return checkpointState;
}

export function convertFromCheckpointState(checkpointState: CheckpointState) {
  const gameState: GameState = {
    actionCount: checkpointState.actionCount,
    blocks: checkpointState.blocks.map(block => BlockState.clone(block)),
    board: checkpointState.board.map(row => {
      return row.map(square => new SquareState(square.levelDataType, square.text));
    }),
    height: checkpointState.height,
    moveCount: checkpointState.moveCount,
    moves: checkpointState.moves.map(checkpointMove => {
      return new Move(
        checkpointMove.code,
        new Position(checkpointMove.pos.x, checkpointMove.pos.y),
        checkpointMove.block?.id,
      );
    }),
    pos: new Position(checkpointState.pos.x, checkpointState.pos.y),
    width: checkpointState.width,
  };

  return gameState;
}
