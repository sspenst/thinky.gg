import TileType from '@root/constants/tileType';
import Direction, { directionToVector } from '@root/constants/direction';
import Position from '@root/models/position';
import TileTypeHelper from './tileTypeHelper';

// convert raw level data into array of arrays
function loadLevel(level: string) {
  const loadedLevel = level.split('\n');
  const output = Array<string[]>();

  for (const k in loadedLevel) {
    output[k] = [];
    const line = loadedLevel[k].split('');

    for (const j in line) {
      output[k][j] = line[j];
    }
  }

  return output;
}

// convert the array of arrays into raw level data
function exportLevel(level: string[][]) {
  let exportedLevel = String();

  for (const k in level) {
    for (const j in level[k]) {
      exportedLevel = exportedLevel.concat(level[k][j]);
    }

    exportedLevel = exportedLevel.concat('\n');
  }

  return exportedLevel.trim();
}

// get height
export function getHeight(level: string) {
  const loadedLevel = loadLevel(level);

  return loadedLevel.length;
}

// get width
export function getWidth(level: string) {
  const loadedLevel = loadLevel(level);

  return loadedLevel[0].length;
}

// trim the walls around a level
export function trimLevel(level: string) {
  const loadedLevel = loadLevel(level);

  // check top row
  let trimTopRow = true;

  while (trimTopRow) {
    for (let k = 0; k < loadedLevel[0].length; k++) {
      if (loadedLevel[0][k] != '1') {
        trimTopRow = false;
        break;
      }
    }

    if (trimTopRow) {
      loadedLevel.splice(0, 1);
    }
  }

  // check bottom row
  let trimBotRow = true;

  while (trimBotRow) {
    for (let k = 0; k < loadedLevel[loadedLevel.length - 1].length; k++) {
      if (loadedLevel[loadedLevel.length - 1][k] != '1') {
        trimBotRow = false;
        break;
      }
    }

    if (trimBotRow) {
      loadedLevel.splice(loadedLevel.length - 1, 1);
    }
  }

  // check left column
  let trimLeftCol = true;

  while (trimLeftCol) {
    for (let k = 0; k < loadedLevel.length; k++) {
      if (loadedLevel[k][0] != '1') {
        trimLeftCol = false;
        break;
      }
    }

    if (trimLeftCol) {
      for (let k = 0; k < loadedLevel.length; k++) {
        loadedLevel[k].splice(0, 1);
      }
    }
  }

  // check right column
  let trimRightCol = true;

  while (trimRightCol) {
    for (let k = 0; k < loadedLevel.length; k++) {
      if (loadedLevel[k][loadedLevel[k].length - 1] != '1') {
        trimRightCol = false;
        break;
      }
    }

    if (trimRightCol) {
      for (let k = 0; k < loadedLevel.length; k++) {
        loadedLevel[k].splice(loadedLevel[k].length - 1, 1);
      }
    }
  }

  return exportLevel(loadedLevel);
}

// turn unreachable tiles into walls
// a tile is unreachable if it cannot be reached by a floodfill from the player where
// walls block, empty tiles and holes are open, and blocks are open iff approached from a pushable side and wouldn't be pushed into a wall
export function simplifyLevelUnreachable(level: string) {
  const loadedLevel = loadLevel(level);

  // locate player (there doesn't seem to be an existing helper for this)
  let player = null;
  for (let y = 0; y < loadedLevel.length; y++) {
    for (let x = 0; x < loadedLevel[y].length; x++) {
      const tileType = loadedLevel[y][x] as TileType;
      if (tileType === TileType.Player || tileType === TileType.PlayerOnExit) {
        player = new Position(x, y);
      }
    }
  }
  if (player === null) {
    // player doesn't exist - prefer changing nothing
    return level;
  }

  // return the tile at pos if it exists and isn't wall, otherwise null
  function tileIfNotWallOrOOB(pos: Position) {
    // bounds checking, copied from gameStateHelpers.ts
    const row = loadedLevel[pos.y];
    if (!row || !row[pos.x]) {
      return null;
    }
    // treat wall same as oob
    const tile = row[pos.x];
    return tile === TileType.Wall ? null : tile;
  }

  // floodfill starting from player
  let reachable = [player];
  let fillIndex = -1;
  while (fillIndex < reachable.length - 1) {
    fillIndex++;
    const pos = reachable[fillIndex];
    for (const direction of [Direction.DOWN, Direction.LEFT, Direction.RIGHT, Direction.UP]) {
      const delta = directionToVector(direction);
      const nextPos = pos.add(delta);
      const nextTile = tileIfNotWallOrOOB(nextPos) as TileType;
      if (!nextTile) {
        // checking position is wall or oob
        continue;
      }
      if (TileTypeHelper.canMove(nextTile)) {
        // checking a block
        if (!TileTypeHelper.canMoveInDirection(nextTile, direction)) {
          // block acts as a wall from this direction
          continue;
        }
        const nextNextPos = nextPos.add(delta);
        const nextNextTile = tileIfNotWallOrOOB(nextNextPos);
        if (!nextNextTile) {
          // block would be pushed into wall or oob
          continue;
        }
      }
      // tile is 'walkable'
      // optimisation (unneeded): can avoid searching the list here and below using a bitarray of 'tile has been reached'
      if (!reachable.some((seenPos) => {return seenPos.x == nextPos.x && seenPos.y == nextPos.y})) {
        // and not queued
        reachable.push(nextPos);
      }
    }
  }

  // turn anything not reachable to wall
  for (let y = 0; y < loadedLevel.length; y++) {
    for (let x = 0; x < loadedLevel[y].length; x++) {
      if (!reachable.some((seenPos) => {return seenPos.x == x && seenPos.y == y})) {
        loadedLevel[y][x] = TileType.Wall;
      }
    }
  }

  return exportLevel(loadedLevel);
}

/* istanbul ignore next */
// rotate a tile 90 degrees counterclockwise
function rotateTileTypeCCW(tileType: TileType) {
  function baseRotateTileTypeCCW(tileType: TileType) {
    switch (tileType) {
      case TileType.Left:
        return TileType.Down;
      case TileType.Up:
        return TileType.Left;
      case TileType.Right:
        return TileType.Up;
      case TileType.Down:
        return TileType.Right;
      case TileType.UpLeft:
        return TileType.DownLeft;
      case TileType.UpRight:
        return TileType.UpLeft;
      case TileType.DownRight:
        return TileType.UpRight;
      case TileType.DownLeft:
        return TileType.DownRight;
      case TileType.NotLeft:
        return TileType.NotDown;
      case TileType.NotUp:
        return TileType.NotLeft;
      case TileType.NotRight:
        return TileType.NotUp;
      case TileType.NotDown:
        return TileType.NotRight;
      case TileType.LeftRight:
        return TileType.UpDown;
      case TileType.UpDown:
        return TileType.LeftRight;
      default:
        return tileType;
    }
  }

  const isOnExit = TileTypeHelper.isOnExit(tileType);
  const tileToRotate = isOnExit ? TileTypeHelper.getExitSibilingTileType(tileType)! : tileType;
  const baseRotatedTileType = baseRotateTileTypeCCW(tileToRotate) as TileType;
  const rotatedTileType = isOnExit ? TileTypeHelper.getExitSibilingTileType(baseRotatedTileType)! : baseRotatedTileType;

  return rotatedTileType;
}

/* istanbul ignore next */
// flip a tile vertically
function filpTileTypeY(tileType: TileType) {
  function baseFlipTileTypeY(tileType: TileType) {
    switch (tileType) {
      case TileType.Up:
        return TileType.Down;
      case TileType.Down:
        return TileType.Up;
      case TileType.UpLeft:
        return TileType.DownLeft;
      case TileType.UpRight:
        return TileType.DownRight;
      case TileType.DownRight:
        return TileType.UpRight;
      case TileType.DownLeft:
        return TileType.UpLeft;
      case TileType.NotUp:
        return TileType.NotDown;
      case TileType.NotDown:
        return TileType.NotUp;
      default:
        return tileType;
    }
  }

  const isOnExit = TileTypeHelper.isOnExit(tileType);
  const tileToFlip = isOnExit ? TileTypeHelper.getExitSibilingTileType(tileType)! : tileType;
  const baseFlippedTileType = baseFlipTileTypeY(tileToFlip) as TileType;
  const flippedTileType = isOnExit ? TileTypeHelper.getExitSibilingTileType(baseFlippedTileType)! : baseFlippedTileType;

  return flippedTileType;
}

// rotate level 90 degrees counterclockwise
export function rotateLevelCCW(level: string) {
  const loadedLevel = loadLevel(level);
  const height = loadedLevel.length;
  const width = loadedLevel[0].length;

  const newLevel = Array<string[]>();

  for (let k = 0; k < width; k++) {
    newLevel[k] = [];
  }

  for (let k = 0; k < height; k++) {
    for (let j = 0; j < width; j++) {
      newLevel[width - 1 - j][k] = rotateTileTypeCCW(loadedLevel[k][j] as TileType);
    }
  }

  return exportLevel(newLevel);
}

// rotate level 90 degrees clockwise
export function rotateLevelCW(level: string) {
  return rotateLevelCCW(rotateLevelCCW(rotateLevelCCW(level)));
}

// flip level vertically
export function flipLevelY(level: string) {
  const loadedLevel = loadLevel(level);
  const height = loadedLevel.length;
  const width = loadedLevel[0].length;

  const newLevel = Array<string[]>();

  for (let k = 0; k < height; k++) {
    newLevel[k] = [];
  }

  for (let k = 0; k < height; k++) {
    for (let j = 0; j < width; j++) {
      newLevel[height - 1 - k][j] = filpTileTypeY(loadedLevel[k][j] as TileType);
    }
  }

  return exportLevel(newLevel);
}

// flip level vertically
export function flipLevelX(level: string) {
  return rotateLevelCCW(flipLevelY(rotateLevelCW(level)));
}

// return a list of level data consisting of all 8 symmetries of the trimmed level (flip and rotate)
export function getAllLevelSymmetries(level: string) {
  const levels = Array<string>();

  let levelTransform = trimLevel(level);

  levels.push(levelTransform);

  for (let k = 0; k < 3; k++) {
    levelTransform = rotateLevelCCW(levelTransform);
    levels.push(levelTransform);
  }

  levelTransform = flipLevelY(levelTransform);
  levels.push(levelTransform);

  for (let k = 0; k < 3; k++) {
    levelTransform = rotateLevelCCW(levelTransform);
    levels.push(levelTransform);
  }

  return levels;
}
