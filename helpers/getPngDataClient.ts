/* istanbul ignore file */
import Dimensions from '../constants/dimensions';
import generateLevelCanvas from './generateLevelCanvas';

export default function getPngDataClient(levelData: string) {
  if (typeof document === 'undefined') {
    return;
  }

  let canvas = document.createElement('canvas');

  canvas.height = Dimensions.LevelCanvasHeight / 2;
  canvas.width = Dimensions.LevelCanvasWidth / 2;

  canvas = generateLevelCanvas(canvas, levelData) as HTMLCanvasElement;

  return canvas.toDataURL();
}
