import { GameState } from '@root/components/level/game';
import BlockState from '@root/models/blockState';
import Move from '@root/models/move';
import Position from '@root/models/position';
import SquareState from '@root/models/squareState';

// NB: legacy interface to allow for refactoring the original GameState
export interface CheckpointState {
  actionCount: number;
  blocks: BlockState[];
  board: SquareState[][];
  height: number;
  moveCount: number;
  moves: Move[];
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
  const checkpointState: CheckpointState = {
    actionCount: gameState.actionCount,
    blocks: gameState.blocks.map(block => BlockState.clone(block)),
    board: gameState.board.map(row => {
      return row.map(square => SquareState.clone(square));
    }),
    height: gameState.height,
    moveCount: gameState.moveCount,
    moves: gameState.moves.map(move => Move.clone(move)),
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
      return row.map(square => SquareState.clone(square));
    }),
    height: checkpointState.height,
    moveCount: checkpointState.moveCount,
    moves: checkpointState.moves.map(move => Move.clone(move)),
    pos: new Position(checkpointState.pos.x, checkpointState.pos.y),
    width: checkpointState.width,
  };

  return gameState;
}
