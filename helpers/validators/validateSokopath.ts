import Direction, { directionToVector } from '@root/constants/direction';
import TileType from '@root/constants/tileType';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import Level from '../../models/db/level';
import Position from '../../models/position';

export default function validateSokopathSolution(directions: Direction[], level: Level) {
  const data = level.data.replace(/\n/g, '').split('') as TileType[];
  const endIndices = [];
  const posIndex = data.indexOf(TileType.Player);
  let pos = new Position(posIndex % level.width, Math.floor(posIndex / level.width));
  let endIndex = -1;

  while ((endIndex = data.indexOf(TileType.Exit, endIndex + 1)) != -1) {
    endIndices.push(endIndex);
  }

  for (let i = 0; i < directions.length; i++) {
    const direction = directions[i];

    // validate and update position with direction
    pos = pos.add(directionToVector(direction));

    if (pos.x < 0 || pos.x >= level.width || pos.y < 0 || pos.y >= level.height) {
      return false;
    }

    const posIndex = pos.y * level.width + pos.x;
    const tileTypeAtPos = data[posIndex];

    // check if new position is valid
    if (tileTypeAtPos === TileType.Wall ||
      tileTypeAtPos === TileType.Hole) {
      return false;
    }

    // if a block is being moved
    if (TileTypeHelper.canMove(tileTypeAtPos)) {
      // validate block is allowed to move in this direction
      if ((direction === Direction.LEFT && !TileTypeHelper.canMoveLeft(tileTypeAtPos)) ||
        (direction === Direction.UP && !TileTypeHelper.canMoveUp(tileTypeAtPos)) ||
        (direction === Direction.RIGHT && !TileTypeHelper.canMoveRight(tileTypeAtPos)) ||
        (direction === Direction.DOWN && !TileTypeHelper.canMoveDown(tileTypeAtPos))) {
        return false;
      }

      // validate and update block position with direction
      const blockPos = pos.add(directionToVector(direction));

      if (blockPos.x < 0 || blockPos.x >= level.width || blockPos.y < 0 || blockPos.y >= level.height) {
        return false;
      }

      const blockPosIndex = blockPos.y * level.width + blockPos.x;

      if (data[blockPosIndex] === TileType.Wall ||
        TileTypeHelper.canMove(data[blockPosIndex] as TileType)) {
        return false;
      } else if (data[blockPosIndex] === TileType.Hole) {
        data[blockPosIndex] = TileType.Default;
      } else {
        data[blockPosIndex] = tileTypeAtPos;
      }

      // clear movable from the position
      data[posIndex] = TileType.Default;
    }
  }

  // check if all exits are covered
  return endIndices.every((index) => {
    const x = index % level.width;
    const y = Math.floor(index / level.width);

    return TileTypeHelper.canMove(data[y * level.width + x]);
  });
}

export function validateSokopathLevel(data: string): {valid: boolean, reasons: string[]} {
  // Must have at least ONE start and at least ONE end (or blockonend) and at least the same number of blocks as ends
  const dataSplit = data.split('\n');
  const height = dataSplit.length;
  const width = dataSplit[0].length;
  let startCount = 0;
  let goalCount = 0;
  let blockCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tileType = dataSplit[y][x] as TileType;

      if (tileType === TileType.Player) {
        startCount++;
      } else {
        if (tileType === TileType.Exit) {
          goalCount++;
        }

        if (TileTypeHelper.canMove(tileType) && !TileTypeHelper.isOnExit(tileType)) {
          blockCount++;
        }
      }
    }
  }

  const reasons = [];

  if (startCount !== 1) {
    reasons.push('Must have exactly one player');
  }

  if (goalCount < 1) {
    reasons.push('Must have at least one uncovered goal');
  }

  if (blockCount < goalCount) {
    reasons.push('Must have as many boxes as goals');
  }

  return { valid: reasons.length === 0, reasons };
}
