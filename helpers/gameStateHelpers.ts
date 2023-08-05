import Direction, { directionToVector } from '@root/constants/direction';
import TileType from '@root/constants/tileType';
import Position from '@root/models/position';
import TileTypeHelper from './tileTypeHelper';

export interface TileState {
  block?: BlockState;
  blockInHole?: BlockState;
  text: number[];
  tileType: TileType;
}

export function cloneTileState(tileState: TileState) {
  const newTileState: TileState = {
    block: tileState.block ? cloneBlockState(tileState.block) : undefined,
    blockInHole: tileState.blockInHole ? cloneBlockState(tileState.blockInHole) : undefined,
    text: tileState.text.slice(),
    tileType: tileState.tileType,
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
  redoStack: Direction[];
}

export function isValidGameState(object: any): object is GameState {
  if (typeof object !== 'object' || object === null) return false;

  const hasValidBoard = Array.isArray(object.board) && object.board.every((row: any[]) => Array.isArray(row) && row.every(tile => isValidTileState(tile)));

  const hasValidMoves = Array.isArray(object.moves) && object.moves.every((move: any) => isValidMove(move));

  const hasValidPos = typeof object.pos === 'object' && object.pos !== null && typeof object.pos.x === 'number' && typeof object.pos.y === 'number';

  const hasValidRedoStack = Array.isArray(object.redoStack) && object.redoStack.every((dir: any) => typeof dir === 'number');

  return hasValidBoard && hasValidMoves && hasValidPos && hasValidRedoStack;
}

function isValidTileState(object: any): object is TileState {
  if (typeof object !== 'object' || object === null) return false;

  const hasValidBlock = typeof object.block === 'undefined' || isValidBlockState(object.block);
  const hasValidBlockInHole = typeof object.blockInHole === 'undefined' || isValidBlockState(object.blockInHole);
  const hasValidText = Array.isArray(object.text) && object.text.every((item: any) => typeof item === 'number');
  const hasValidTileType = Object.values(TileType).includes(object.tileType);

  return hasValidBlock && hasValidBlockInHole && hasValidText && hasValidTileType;
}

function isValidBlockState(object: any): object is BlockState {
  if (typeof object !== 'object' || object === null) return false;
  const hasValidId = typeof object.id === 'number';
  const hasValidTileType = Object.values(TileType).includes(object.tileType);

  return hasValidId && hasValidTileType;
}

function isValidMove(object: any): object is Move {
  if (typeof object !== 'object' || object === null) return false;

  const hasValidBlockId = typeof object.blockId === 'undefined' || typeof object.blockId === 'number';
  const hasValidDirection = typeof object.direction === 'number';

  return hasValidBlockId && hasValidDirection;
}

export function cloneGameState(gameState: GameState) {
  const newGameState: GameState = {
    board: gameState.board.map(row => {
      return row.map(tileState => cloneTileState(tileState));
    }),
    moves: gameState.moves.map(move => cloneMove(move)),
    pos: new Position(gameState.pos.x, gameState.pos.y),
    redoStack: [...gameState.redoStack],
  };

  return newGameState;
}

export function areEqualGameStates(g1: GameState, g2: GameState) {
  return (
    g1.board.length === g2.board.length &&
    g1.board.every((row, y) => {
      return row.length === g2.board[y].length &&
        row.every((tileState, x) => {
          return tileState.block?.id === g2.board[y][x].block?.id &&
            tileState.block?.tileType === g2.board[y][x].block?.tileType &&
            tileState.blockInHole?.id === g2.board[y][x].blockInHole?.id &&
            tileState.blockInHole?.tileType === g2.board[y][x].blockInHole?.tileType &&
            tileState.text.every((t, i) => t === g2.board[y][x].text[i]) &&
            tileState.tileType === g2.board[y][x].tileType;
        });
    }) &&
    g1.moves.every((move, i) => {
      return move.blockId === g2.moves[i].blockId &&
        move.direction === g2.moves[i].direction;
    }) &&
    g1.pos.equals(g2.pos) &&
    g1.redoStack.length === g2.redoStack.length &&
    g1.redoStack.every((direction, i) => direction === g2.redoStack[i])
  );
}

export function initGameState(levelData: string) {
  const data = levelData.split('\n');
  const height = data.length;
  const width = data[0].length;
  const board = Array(height).fill(undefined).map(() =>
    new Array(width).fill(undefined).map(() => {
      return {
        block: undefined,
        text: [],
        tileType: TileType.Default,
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
    redoStack: [],
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

  // clear the redo stack if this direction doesn't match
  if (direction !== gameState.redoStack.pop()) {
    gameState.redoStack = [];
  }

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
  gameState.redoStack.push(prevMove.direction);

  return true;
}
