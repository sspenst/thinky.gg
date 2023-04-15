import LevelUtil from '@root/constants/LevelUtil';
import Level from '../models/db/level';
import Position, { getDirectionFromCode } from '../models/position';

export default function validateSolution(codes: string[], level: Level) {
  const data = level.data.replace(/\n/g, '').split('');
  const endIndices = [];
  const posIndex = data.indexOf(LevelUtil.Start);
  let pos = new Position(posIndex % level.width, Math.floor(posIndex / level.width));
  let endIndex = -1;

  while ((endIndex = data.indexOf(LevelUtil.End, endIndex + 1)) != -1) {
    endIndices.push(endIndex);
  }

  for (let i = 0; i < codes.length; i++) {
    const direction = getDirectionFromCode(codes[i]);

    if (!direction) {
      return false;
    }

    // validate and update position with direction
    pos = pos.add(direction);

    if (pos.x < 0 || pos.x >= level.width || pos.y < 0 || pos.y >= level.height) {
      return false;
    }

    const posIndex = pos.y * level.width + pos.x;
    const levelDataTypeAtPos = data[posIndex];

    // check if new position is valid
    if (levelDataTypeAtPos === LevelUtil.Wall ||
        levelDataTypeAtPos === LevelUtil.Hole) {
      return false;
    }

    // if a block is being moved
    if (LevelUtil.canMove(levelDataTypeAtPos)) {
      // validate block is allowed to move in this direction
      if ((direction.equals(new Position(-1, 0)) && !LevelUtil.canMoveLeft(levelDataTypeAtPos)) ||
          (direction.equals(new Position(0, -1)) && !LevelUtil.canMoveUp(levelDataTypeAtPos)) ||
          (direction.equals(new Position(1, 0)) && !LevelUtil.canMoveRight(levelDataTypeAtPos)) ||
          (direction.equals(new Position(0, 1)) && !LevelUtil.canMoveDown(levelDataTypeAtPos))) {
        return false;
      }

      // validate and update block position with direction
      const blockPos = pos.add(direction);

      if (blockPos.x < 0 || blockPos.x >= level.width || blockPos.y < 0 || blockPos.y >= level.height) {
        return false;
      }

      const blockPosIndex = blockPos.y * level.width + blockPos.x;

      if (data[blockPosIndex] === LevelUtil.Wall ||
          LevelUtil.canMove(data[blockPosIndex])) {
        return false;
      } else if (data[blockPosIndex] === LevelUtil.Hole) {
        data[blockPosIndex] = LevelUtil.Default;
      } else {
        data[blockPosIndex] = levelDataTypeAtPos;
      }

      // clear movable from the position
      data[posIndex] = LevelUtil.Default;
    }
  }

  return endIndices.includes(pos.y * level.width + pos.x);
}
