import { Bitmap } from 'pureimage/types/bitmap';
import Level from '../models/db/level';
import LevelDataType from '../constants/levelDataType';

export default function generateLevelCanvas(canvas: Bitmap | HTMLCanvasElement, level: Level) {
  const cellSize = level.width / level.height > canvas.width / canvas.height ?
    Math.floor(canvas.width / level.width) : Math.floor(canvas.height / level.height);
  const xOffset = Math.floor((canvas.width - level.width * cellSize) / 2);
  const yOffset = Math.floor((canvas.height - level.height * cellSize) / 2);
  const cellMargin = Math.round(cellSize / 40) || 1;
  const borderWidth = Math.round(cellSize / 5);

  const context = canvas.getContext('2d');

  if (!context) {
    return '';
  }

  context.imageSmoothingEnabled = false;
  context.fillStyle = 'rgb(38, 38, 38)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const levelData = level.data.split('\n');

  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      const levelDataType = levelData[y][x] as LevelDataType;

      switch (levelDataType) {
      case LevelDataType.Default:
        context.fillStyle = 'rgb(14, 168, 117)';
        break;
      case LevelDataType.Wall:
        // skip since it's the same color as the background
        continue;
      case LevelDataType.End:
        context.fillStyle = 'rgb(255, 255, 255)';
        break;
      case LevelDataType.Start:
        context.fillStyle = 'rgb(244, 114, 182)';
        break;
      case LevelDataType.Hole:
        context.fillStyle = 'rgb(65, 65, 65)';
        break;
      default:
        context.fillStyle = 'rgb(0, 0, 0)';
      }

      context.fillRect(
        xOffset + x * cellSize + cellMargin,
        yOffset + y * cellSize + cellMargin,
        cellSize - 2 * cellMargin,
        cellSize - 2 * cellMargin,
      );

      context.fillStyle = levelDataType === LevelDataType.Hole ? 'rgb(106, 106, 106)' : 'rgb(183, 119, 57)';

      if (LevelDataType.canMoveLeft(levelDataType) || levelDataType === LevelDataType.Hole) {
        context.fillRect(
          xOffset + (x + 1) * cellSize - cellMargin - borderWidth,
          yOffset + y * cellSize + cellMargin,
          borderWidth,
          cellSize - 2 * cellMargin,
        );
      }

      if (LevelDataType.canMoveUp(levelDataType) || levelDataType === LevelDataType.Hole) {
        context.fillRect(
          xOffset + x * cellSize + cellMargin,
          yOffset + (y + 1) * cellSize - cellMargin - borderWidth,
          cellSize - 2 * cellMargin,
          borderWidth
        );
      }

      if (LevelDataType.canMoveRight(levelDataType) || levelDataType === LevelDataType.Hole) {
        context.fillRect(
          xOffset + x * cellSize + cellMargin,
          yOffset + y * cellSize + cellMargin,
          borderWidth,
          cellSize - 2 * cellMargin,
        );
      }

      if (LevelDataType.canMoveDown(levelDataType) || levelDataType === LevelDataType.Hole) {
        context.fillRect(
          xOffset + x * cellSize + cellMargin,
          yOffset + y * cellSize + cellMargin,
          cellSize - 2 * cellMargin,
          borderWidth,
        );
      }
    }
  }

  return canvas;
}
