import Dimensions from '../constants/dimensions';
import Level from '../models/db/level';
import generateLevelCanvas from './generateLevelCanvas';

export default function getPngDataClient(level: Level) {
  if (!document) {
    return;
  }

  let canvas = document.createElement('canvas');

  canvas.height = Dimensions.LevelCanvasHeight / 2;
  canvas.width = Dimensions.LevelCanvasWidth / 2;

  canvas = generateLevelCanvas(canvas, level) as HTMLCanvasElement;

  return canvas.toDataURL();
}
