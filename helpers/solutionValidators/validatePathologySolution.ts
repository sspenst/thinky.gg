import Direction, { directionToVector } from '@root/constants/direction';
import TileType from '@root/constants/tileType';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import Level from '../../models/db/level';
import Position from '../../models/position';

export default function validatePathologySolution(directions: Direction[], level: Level) {
  const data = level.data.replace(/\n/g, '').split('') as TileType[];
  const endIndices = [];
  const posIndex = data.indexOf(TileType.Start);
  let pos = new Position(posIndex % level.width, Math.floor(posIndex / level.width));
  let endIndex = -1;

  while ((endIndex = data.indexOf(TileType.End, endIndex + 1)) != -1) {
    endIndices.push(endIndex);
  }

  for (let i = 0; i < directions.length; i++) {
    // cannot continue moving if already on an exit
    if (data[pos.y * level.width + pos.x] === TileType.End) {
      return false;
    }

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

  return endIndices.includes(pos.y * level.width + pos.x);
}

export function validatePathologyLevelValid(data: string): { valid: boolean, reasons: string[] } {
  // data must have at least ONE start and ONE end
  const reasons = [];

  if (data.indexOf(TileType.Start) === -1) {
    reasons.push('Need start tile');
  }

  if (data.indexOf(TileType.End) === -1) {
    reasons.push('Need end tile');
  }

  return { valid: reasons.length === 0, reasons };
}
