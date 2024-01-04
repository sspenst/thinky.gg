/* istanbul ignore file */
import { Game } from '@root/constants/Games';
import Dimensions from '../constants/dimensions';
import generateLevelCanvas from './generateLevelCanvas';

export default function getPngDataClient(game: Game, levelData: string) {
  if (typeof document === 'undefined') {
    return;
  }

  let canvas = document.createElement('canvas');

  canvas.height = Dimensions.LevelCanvasHeight / 2;
  canvas.width = Dimensions.LevelCanvasWidth / 2;

  canvas = generateLevelCanvas(canvas, game, levelData) as HTMLCanvasElement;

  return canvas.toDataURL();
}
