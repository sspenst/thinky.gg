import Direction, { directionToVector } from '@root/constants/direction';
import TileType from '@root/constants/tileType';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import Level from '../models/db/level';
import Position from '../models/position';
import { flipLevelX, flipLevelY, rotateLevelCCW, rotateLevelCW } from './transformLevel';

function getHashMultiplerLevelRotation(matchId: string, levelId: string, modBy: number = 8) {
  // hash by using the match.matchId and the level._id. convert those to numbers. matchId is a alphanumeric youtube id like v7EHO5sDV3H and level._id is an 24 character hex string like 5f9b1b1b1b1b1b1b1b1b1b1b
  levelId = levelId.substring(0, 8); // only use the first 8 characters of the levelId this is the timestamp
  matchId = matchId.substring(0, 8); // only use the first 8 characters of the matchId so we don't go over the max safe integer
  const matchIdNumber = parseInt(matchId, 36); // this should work because matchId is alphanumeric and there are 36 alphanumeric characters...
  const levelIdNumber = parseInt(levelId, 16); // this should work because levelId is hex and there are 16 hex characters...

  // hash should be modded by 8
  return (matchIdNumber + levelIdNumber) % modBy;
}

/** update level in place
 * @param level level to rotate
 * @param match match to use as hash
 */
export function randomRotateLevelDataViaMatchHash(level: Level, matchId: string) {
  const hash = getHashMultiplerLevelRotation(matchId, level._id.toString());

  const orientations = [
    [], // do nothing
    [rotateLevelCCW], // rotate 90 degrees counter-clockwise
    [rotateLevelCCW, rotateLevelCCW], // rotate 180 degrees
    [rotateLevelCW], // rotate 90 degrees clockwise
    [flipLevelX], // flip along the X-axis
    [flipLevelY], // flip along the Y-axis
    [rotateLevelCCW, flipLevelX], // rotate 90 degrees counter-clockwise and flip X
    [rotateLevelCW, flipLevelX] // rotate 90 degrees clockwise and flip X
  ];
  // if rotationAmount is negative, we want to rotate left, otherwise rotate right
  const rotationFunction = orientations[hash];

  // apply the rotation

  rotationFunction.forEach((rotation) => {
    level.data = rotation(level.data);
  });
  level.width = level.data.indexOf('\n');
  level.height = level.data.length / level.width;
}

export default function validateSolution(directions: Direction[], level: Level) {
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
