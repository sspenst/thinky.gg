import Direction, { directionToVector } from '@root/constants/direction';
import TileType from '@root/constants/tileType';
import Position from '@root/models/position';
import TileTypeHelper from './tileTypeHelper';

export interface TileState {
  block?: BlockState;
  blockInHole?: BlockState;
  tileType: TileType;
  text: number[];
}

export function cloneTileState(tileState: TileState) {
  const newTileState: TileState = {
    block: tileState.block ? cloneBlockState(tileState.block) : undefined,
    blockInHole: tileState.blockInHole ? cloneBlockState(tileState.blockInHole) : undefined,
    tileType: tileState.tileType,
    text: tileState.text.slice(),
  };

  return newTileState;
}

export interface BlockState {
  id: number;
  tileType: TileType;
}

export function cloneBlockState(blockState: BlockState) {
  const newBlockState: BlockState = {
    id: blockState.id,
    tileType: blockState.tileType,
  };

  return newBlockState;
}

export interface Move {
  // the id of the block pushed during this move
  blockId?: number;
  direction: Direction;
}

export function cloneMove(move: Move) {
  const newMove: Move = {
    blockId: move.blockId,
    direction: move.direction,
  };

  return newMove;
}

export interface GameState {
  board: TileState[][];
  moves: Move[];
  pos: Position;
}

export function cloneGameState(gameState: GameState) {
  const newGameState: GameState = {
    board: gameState.board.map(row => {
      return row.map(tileState => cloneTileState(tileState));
    }),
    moves: gameState.moves.map(move => cloneMove(move)),
    pos: new Position(gameState.pos.x, gameState.pos.y),
  };

  return newGameState;
}

export function initGameState(levelData: string) {
  const data = levelData.split('\n');
  const height = data.length;
  const width = data[0].length;
  const board = Array(height).fill(undefined).map(() =>
    new Array(width).fill(undefined).map(() => {
      return {
        block: undefined,
        tileType: TileType.Default,
        text: [],
      } as TileState;
    }));
  let blockId = 0;
  let pos = new Position(0, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tileType = data[y][x] as TileType;

      if (tileType === TileType.Wall ||
        tileType === TileType.End ||
        tileType === TileType.Hole) {
        board[y][x].tileType = tileType;
      } else if (tileType === TileType.Start) {
        pos = new Position(x, y);
      } else if (TileTypeHelper.canMove(tileType)) {
        board[y][x].block = {
          id: blockId++,
          tileType: tileType,
        } as BlockState;
      }
    }
  }

  const gameState: GameState = {
    board: board,
    moves: [],
    pos: pos,
  };

  return gameState;
}

// boundary checks
function isPositionValid(board: TileState[][], pos: Position) {
  const row = board[pos.y];

  if (!row) {
    return false;
  }

  return !!row[pos.x];
}

// can the player move to this position
function isPlayerPositionValid(board: TileState[][], pos: Position) {
  return isPositionValid(board, pos) && board[pos.y][pos.x].tileType !== TileType.Wall && board[pos.y][pos.x].tileType !== TileType.Hole;
}

// can a block move to this position
function isBlockPositionValid(board: TileState[][], pos: Position) {
  return isPositionValid(board, pos) && board[pos.y][pos.x].tileType !== TileType.Wall && !board[pos.y][pos.x].block;
}

/**
 * check if a free undo is possible (backtracking without pushing blocks)
 */
function checkForFreeUndo(gameState: GameState, direction: Direction): boolean {
  if (gameState.moves.length === 0) {
    return false;
  }

  const lastMove = gameState.moves[gameState.moves.length - 1];

  // no free undo if you moved a block
  if (lastMove.blockId !== undefined) {
    return false;
  }

  const newPos = gameState.pos.add(directionToVector(direction));
  const undoPos = gameState.pos.sub(directionToVector(lastMove.direction));

  // free undo if you are going back to the same position
  return undoPos.equals(newPos);
}

/**
 * update a gameState in-place with a new move
 * @returns if the move was valid
 */
export function makeMove(gameState: GameState, direction: Direction, allowFreeUndo = false): boolean {
  const posTileState = gameState.board[gameState.pos.y][gameState.pos.x];

  // lock movement once you reach the finish
  if (posTileState.tileType === TileType.End) {
    return false;
  }

  // before making a move, check if undo is a better choice
  if (allowFreeUndo && checkForFreeUndo(gameState, direction)) {
    return undo(gameState);
  }

  const text = posTileState.text;

  // save text if it doesn't already exist (may exist due to undo)
  if (text[text.length - 1] !== gameState.moves.length) {
    text.push(gameState.moves.length);
  }

  // calculate the position to move to
  const newPos = gameState.pos.add(directionToVector(direction));

  if (!isPlayerPositionValid(gameState.board, newPos)) {
    return false;
  }

  const newPosTileState = gameState.board[newPos.y][newPos.x];
  const block = newPosTileState.block;
  const move: Move = { direction: direction };

  // if there is a block at the new position
  if (block) {
    const newBlockPos = newPos.add(directionToVector(direction));

    // if the block is not allowed to move this direction or the new position is invalid
    if (!TileTypeHelper.canMoveInDirection(block.tileType, direction) ||
      !isBlockPositionValid(gameState.board, newBlockPos)) {
      return false;
    }

    // track block id that was pushed
    move.blockId = block.id;

    // clear out old block
    newPosTileState.block = undefined;

    const newBlockPosTileState = gameState.board[newBlockPos.y][newBlockPos.x];

    // update block state
    if (newBlockPosTileState.tileType === TileType.Hole) {
      newBlockPosTileState.blockInHole = block;
      newBlockPosTileState.tileType = TileType.Default;
    } else {
      newBlockPosTileState.block = block;
    }
  }

  gameState.moves.push(move);
  gameState.pos = newPos;

  return true;
}

/**
 * undo the latest move from a gameState in-place
 * @returns if the undo was successful
 */
export function undo(gameState: GameState): boolean {
  const prevMove = gameState.moves.pop();

  // nothing to undo
  if (!prevMove) {
    return false;
  }

  const posTileState = gameState.board[gameState.pos.y][gameState.pos.x];

  // remove text only from the current position for smoother animations
  const text = posTileState.text;

  // the text may not exist since it is only added when moving away from a position
  if (text[text.length - 1] === gameState.moves.length + 1) {
    text.pop();
  }

  // undo the block push
  if (prevMove.blockId !== undefined) {
    const blockPos = gameState.pos.add(directionToVector(prevMove.direction));
    const blockPosTileState = gameState.board[blockPos.y][blockPos.x];

    if (blockPosTileState.block?.id === prevMove.blockId) {
      // restore previous block position
      posTileState.block = blockPosTileState.block;
      blockPosTileState.block = undefined;
    } else if (blockPosTileState.blockInHole?.id === prevMove.blockId) {
      // restore hole and previous block in hole position
      posTileState.block = blockPosTileState.blockInHole;
      blockPosTileState.blockInHole = undefined;
      blockPosTileState.tileType = TileType.Hole;
    } else {
      // should not happen unless gameState is manually altered
      return false;
    }
  }

  // restore previous position
  gameState.pos = gameState.pos.sub(directionToVector(prevMove.direction));

  return true;
}
