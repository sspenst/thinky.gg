import { GameState, SessionCheckpointState } from '@root/components/level/game';
import Direction, { getDirectionFromCode } from '@root/constants/direction';
import TileType from '@root/constants/tileType';
import BlockState from '@root/models/blockState';
import Move from '@root/models/move';
import Position from '@root/models/position';
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

export function isValidSessionCheckpointState(sessionCheckpointState: SessionCheckpointState): boolean {
  if (sessionCheckpointState.directions) {
    return isValidDirections(sessionCheckpointState.directions);
  } else if (sessionCheckpointState.checkpointState) {
    return isValidCheckpointState(sessionCheckpointState.checkpointState);
  } else {
    return false;
  }
}

export function isValidDirections(directions: unknown) {
  if (!Array.isArray(directions)) {
    return false;
  }

  for (const direction of directions) {
    if (!(direction in Direction)) {
      return false;
    }
  }

  return true;
}

// checks for valid CheckpointState or Direction[]
export function isValidCheckpointState(value: unknown) {
  if (isValidDirections(value)) {
    return true;
  }

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

export function gameStateToCheckpoint(gameState: GameState): Direction[] {
  return gameState.moves.map(move => move.direction);
}

export function sessionCheckpointStateToGameState(sessionCheckpointState: SessionCheckpointState): GameState | null {
  if (sessionCheckpointState.directions) {
    return checkpointToGameState(sessionCheckpointState.directions);
  } else if (sessionCheckpointState.checkpointState) {
    return checkpointToGameState(sessionCheckpointState.checkpointState);
  } else {
    return null;
  }
}

export function checkpointToGameState(checkpointState: CheckpointState | Direction[]): GameState | null {
  if (Array.isArray(checkpointState)) {
    // TODO: produce game state from directions (need level data as param or something)
    // return null for invalid game state
    return null;
  }

  const gameState: GameState = {
    actionCount: checkpointState.actionCount,
    blocks: checkpointState.blocks.map(block => BlockState.clone(block)),
    board: checkpointState.board.map(row => {
      return row.map(square => new SquareState(square.levelDataType, square.text));
    }),
    height: checkpointState.height,
    moveCount: checkpointState.moveCount,
    moves: checkpointState.moves.map(checkpointMove => {
      const direction = getDirectionFromCode(checkpointMove.code);

      if (!direction) {
        throw new Error(`Invalid checkpoint code ${checkpointMove.code}`);
      }

      return new Move(
        direction,
        new Position(checkpointMove.pos.x, checkpointMove.pos.y),
        checkpointMove.block?.id,
      );
    }),
    pos: new Position(checkpointState.pos.x, checkpointState.pos.y),
    width: checkpointState.width,
  };

  return gameState;
}
