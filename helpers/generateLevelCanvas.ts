/* istanbul ignore file */
import TileType, { TileTypeDefaultVisited } from '@root/constants/tileType';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import { Bitmap } from 'pureimage';

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
      const tileType = levelRows[y][x] as TileType | typeof TileTypeDefaultVisited;

      switch (tileType) {
      case TileType.Default:
        // TODO: if visited, different color
        context.fillStyle = 'rgb(14, 168, 117)';
        break;
      case TileTypeDefaultVisited:
        context.fillStyle = 'rgb(4, 120, 87)';
        break;
      case TileType.Wall:
        // skip since it's the same color as the background
        continue;
      case TileType.End:
        context.fillStyle = 'rgb(255, 255, 255)';
        break;
      case TileType.Start:
        context.fillStyle = 'rgb(244, 114, 182)';
        break;
      case TileType.Hole:
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

      if (tileType === TileTypeDefaultVisited) {
        continue;
      }

      context.fillStyle = tileType === TileType.Hole ? 'rgb(106, 106, 106)' : 'rgb(183, 119, 57)';

      if (TileTypeHelper.canMoveLeft(tileType) || tileType === TileType.Hole) {
        context.fillRect(
          xOffset + (x + 1) * cellSize - cellMargin - borderWidth,
          yOffset + y * cellSize + cellMargin,
          borderWidth,
          cellSize - 2 * cellMargin,
        );
      }

      if (TileTypeHelper.canMoveUp(tileType) || tileType === TileType.Hole) {
        context.fillRect(
          xOffset + x * cellSize + cellMargin,
          yOffset + (y + 1) * cellSize - cellMargin - borderWidth,
          cellSize - 2 * cellMargin,
          borderWidth
        );
      }

      if (TileTypeHelper.canMoveRight(tileType) || tileType === TileType.Hole) {
        context.fillRect(
          xOffset + x * cellSize + cellMargin,
          yOffset + y * cellSize + cellMargin,
          borderWidth,
          cellSize - 2 * cellMargin,
        );
      }

      if (TileTypeHelper.canMoveDown(tileType) || tileType === TileType.Hole) {
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
