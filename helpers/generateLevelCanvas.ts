/* istanbul ignore file */
import { GameId } from '@root/constants/GameId';
import { GameType } from '@root/constants/Games';
import TileType, { TileTypeDefaultVisited } from '@root/constants/tileType';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import { Bitmap } from 'pureimage';
import { getGameFromId } from './getGameIdFromReq';

export default function generateLevelCanvas(canvas: Bitmap | HTMLCanvasElement, gameId: GameId, levelData: string) {
  const context = canvas.getContext('2d');

  if (!context) {
    return canvas;
  }

  const game = getGameFromId(gameId);

  context.imageSmoothingEnabled = false;
  context.fillStyle = 'rgb(38, 38, 38)';
  context.fillRect(0, 0, canvas.width, canvas.height); // fyi...this costs 400ms

  const levelRows = levelData.split('\n');
  const height = levelRows.length;
  const width = levelRows[0].length;

  const tileSize = width / height > canvas.width / canvas.height ?
    Math.floor(canvas.width / width) : Math.floor(canvas.height / height);
  const borderWidth = Math.round(tileSize / 40) || 1;
  const innerTileSize = tileSize - 2 * borderWidth;
  const innerBorderWidth = Math.round(innerTileSize / 4.5);

  const xOffset = Math.floor((canvas.width - width * tileSize) / 2);
  const yOffset = Math.floor((canvas.height - height * tileSize) / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tileType = levelRows[y][x] as TileType | typeof TileTypeDefaultVisited;

      switch (tileType) {
      case TileType.Default:
        context.fillStyle = 'rgb(14, 168, 117)';
        break;
      case TileTypeDefaultVisited:
        context.fillStyle = 'rgb(4, 120, 87)';
        break;
      case TileType.Wall:
        // skip since it's the same color as the background
        continue;
      case TileType.Exit:
        context.fillStyle = game.type === GameType.COMPLETE_AND_SHORTEST ? 'rgb(14, 168, 117)' : 'rgb(255, 255, 255)';
        break;
      case TileType.Player:
      case TileType.PlayerOnExit:
        context.fillStyle = 'rgb(244, 114, 182)';
        break;
      case TileType.Hole:
        context.fillStyle = 'rgb(65, 65, 65)';
        break;
      default:
        context.fillStyle = 'rgb(0, 0, 0)';
      }

      // draw main background color for this cell
      context.fillRect(
        xOffset + x * tileSize + borderWidth,
        yOffset + y * tileSize + borderWidth,
        tileSize - 2 * borderWidth,
        tileSize - 2 * borderWidth,
      );

      if (tileType === TileTypeDefaultVisited) {
        continue;
      }

      // draw dot for goal
      if (game.type === GameType.COMPLETE_AND_SHORTEST && tileType === TileType.Exit) {
        context.fillStyle = 'rgb(255, 255, 255)';

        context.fillRect(
          xOffset + x * tileSize + borderWidth + innerBorderWidth,
          yOffset + y * tileSize + borderWidth + innerBorderWidth,
          tileSize - 2 * (borderWidth + innerBorderWidth),
          tileSize - 2 * (borderWidth + innerBorderWidth),
        );

        continue;
      }

      context.fillStyle = tileType === TileType.Hole ? 'rgb(106, 106, 106)' : TileTypeHelper.isOnExit(tileType) ? 'rgb(255, 255, 255)' : 'rgb(183, 119, 57)';

      // draw directional borders for movables and holes
      if (TileTypeHelper.canMoveLeft(tileType) || tileType === TileType.Hole) {
        context.fillRect(
          xOffset + (x + 1) * tileSize - borderWidth - innerBorderWidth,
          yOffset + y * tileSize + borderWidth,
          innerBorderWidth,
          tileSize - 2 * borderWidth,
        );
      }

      if (TileTypeHelper.canMoveUp(tileType) || tileType === TileType.Hole) {
        context.fillRect(
          xOffset + x * tileSize + borderWidth,
          yOffset + (y + 1) * tileSize - borderWidth - innerBorderWidth,
          tileSize - 2 * borderWidth,
          innerBorderWidth
        );
      }

      if (TileTypeHelper.canMoveRight(tileType) || tileType === TileType.Hole) {
        context.fillRect(
          xOffset + x * tileSize + borderWidth,
          yOffset + y * tileSize + borderWidth,
          innerBorderWidth,
          tileSize - 2 * borderWidth,
        );
      }

      if (TileTypeHelper.canMoveDown(tileType) || tileType === TileType.Hole) {
        context.fillRect(
          xOffset + x * tileSize + borderWidth,
          yOffset + y * tileSize + borderWidth,
          tileSize - 2 * borderWidth,
          innerBorderWidth,
        );
      }
    }
  }

  return canvas;
}
