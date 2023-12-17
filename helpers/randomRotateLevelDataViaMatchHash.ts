import Level from '../models/db/level';
import { getHashMultiplerLevelRotation } from './getHashMultiplerLevelRotation';
import { flipLevelX, flipLevelY, rotateLevelCCW, rotateLevelCW } from './transformLevel';

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

  const data = level.data.split('\n');

  level.width = data[0].length;
  level.height = data.length;
}
