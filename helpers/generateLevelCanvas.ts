import { Bitmap } from 'pureimage/types/bitmap';
import LevelUtil from '../constants/levelDataType';

/* istanbul ignore next */
export default function generateLevelCanvas(canvas: Bitmap | HTMLCanvasElement, levelData: string) {
  const levelRows = levelData.split('\n');
  const height = levelRows.length;
  const width = levelRows[0].length;
  const cellSize = width / height > canvas.width / canvas.height ?
    Math.floor(canvas.width / width) : Math.floor(canvas.height / height);
  const xOffset = Math.floor((canvas.width - width * cellSize) / 2);
  const yOffset = Math.floor((canvas.height - height * cellSize) / 2);
  const cellMargin = Math.round(cellSize / 40) || 1;
  const borderWidth = Math.round(cellSize / 5);
  const context = canvas.getContext('2d');

  if (!context) {
    return canvas;
  }

  context.imageSmoothingEnabled = false;
  context.fillStyle = 'rgb(38, 38, 38)';
  context.fillRect(0, 0, canvas.width, canvas.height); // fyi...this costs 400ms

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const levelDataType = levelRows[y][x] as LevelUtil;

      switch (levelDataType) {
      case LevelUtil.Default:
        context.fillStyle = 'rgb(14, 168, 117)';
        break;
      case LevelUtil.DefaultVisited:
        context.fillStyle = 'rgb(4, 120, 87)';
        break;
      case LevelUtil.Wall:
        // skip since it's the same color as the background
        continue;
      case LevelUtil.End:
        context.fillStyle = 'rgb(255, 255, 255)';
        break;
      case LevelUtil.Start:
        context.fillStyle = 'rgb(244, 114, 182)';
        break;
      case LevelUtil.Hole:
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

      context.fillStyle = levelDataType === LevelUtil.Hole ? 'rgb(106, 106, 106)' : 'rgb(183, 119, 57)';

      if (LevelUtil.canMoveLeft(levelDataType) || levelDataType === LevelUtil.Hole) {
        context.fillRect(
          xOffset + (x + 1) * cellSize - cellMargin - borderWidth,
          yOffset + y * cellSize + cellMargin,
          borderWidth,
          cellSize - 2 * cellMargin,
        );
      }

      if (LevelUtil.canMoveUp(levelDataType) || levelDataType === LevelUtil.Hole) {
        context.fillRect(
          xOffset + x * cellSize + cellMargin,
          yOffset + (y + 1) * cellSize - cellMargin - borderWidth,
          cellSize - 2 * cellMargin,
          borderWidth
        );
      }

      if (LevelUtil.canMoveRight(levelDataType) || levelDataType === LevelUtil.Hole) {
        context.fillRect(
          xOffset + x * cellSize + cellMargin,
          yOffset + y * cellSize + cellMargin,
          borderWidth,
          cellSize - 2 * cellMargin,
        );
      }

      if (LevelUtil.canMoveDown(levelDataType) || levelDataType === LevelUtil.Hole) {
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
