import Direction, { directionToPosition } from '@root/constants/direction';
import TileType from '@root/constants/tileType';
import BlockState from '@root/models/blockState';
import Move from '@root/models/move';
import Position from '@root/models/position';
import SquareState from '@root/models/squareState';
import TileTypeHelper from './tileTypeHelper';

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

export function cloneGameState(gameState: GameState) {
  const newGameState: GameState = {
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

  return newGameState;
}

export function initGameState(levelData: string, actionCount = 0) {
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
      const tileType = data[y][x] as TileType;

      if (tileType === TileType.Wall ||
        tileType === TileType.End ||
        tileType === TileType.Hole) {
        board[y][x].tileType = tileType;
      } else if (tileType === TileType.Start) {
        pos = new Position(x, y);
      } else if (TileTypeHelper.canMove(tileType)) {
        blocks.push(new BlockState(blockId++, tileType as TileType, x, y));
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
  return isPositionValid(height, pos, width) && board[pos.y][pos.x].tileType !== TileType.Wall &&
    board[pos.y][pos.x].tileType !== TileType.Hole;
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

// can a block move to this position
function isBlockPositionValid(
  board: SquareState[][],
  blocks: BlockState[],
  height: number,
  pos: Position,
  width: number,
) {
  return isPositionValid(height, pos, width) && board[pos.y][pos.x].tileType !== TileType.Wall &&
    !isBlockAtPosition(blocks, pos);
}

function isBlockAtPosition(blocks: BlockState[], pos: Position) {
  return getBlockIndexAtPosition(blocks, pos) !== -1;
}

/**
 * update a gameState in-place using the given direction
 * @returns if the move was valid
 */
// TODO: use this in game.tsx
export function makeMove(gameState: GameState, direction: Direction): boolean {
  // lock movement once you reach the finish
  if (gameState.board[gameState.pos.y][gameState.pos.x].tileType === TileType.End) {
    return false;
  }

  const move = new Move(direction, gameState.pos);
  const text = gameState.board[gameState.pos.y][gameState.pos.x].text;

  // save text if it doesn't already exist (may exist due to undo)
  if (text[text.length - 1] !== gameState.moveCount) {
    text.push(gameState.moveCount);
  }

  // calculate the target tile to move to
  gameState.pos = gameState.pos.add(directionToPosition(direction));

  // TODO: need to check for free undo here
  // optional allowFreeUndo param

  // if the position didn't change or the new position is invalid
  if (!isPlayerPositionValid(gameState.board, gameState.height, gameState.pos, gameState.width)) {
    return false;
  }

  const blockIndex = getBlockIndexAtPosition(gameState.blocks, gameState.pos);

  // if there is a block at the new position
  if (blockIndex !== -1) {
    const block = gameState.blocks[blockIndex];
    const blockPos = block.pos.add(directionToPosition(direction));

    // if the block is not allowed to move this direction or the new position is invalid
    if (!block.canMoveTo(blockPos) ||
      !isBlockPositionValid(gameState.board, gameState.blocks, gameState.height, blockPos, gameState.width)) {
      return false;
    }

    move.blockId = block.id;
    block.pos = blockPos;

    // remove block if it is pushed onto a hole
    if (gameState.board[blockPos.y][blockPos.x].tileType === TileType.Hole) {
      block.inHole = true;
      gameState.board[blockPos.y][blockPos.x].tileType = TileType.Default;
    }
  }

  gameState.moves.push(move);
  gameState.actionCount += 1;
  gameState.moveCount += 1;

  return true;
}
