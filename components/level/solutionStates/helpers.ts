import { Game, Games } from '@root/constants/Games';
import TileType from '@root/constants/tileType';
import { GameState } from '@root/helpers/gameStateHelpers';

export function getSolveStateFunction(game: Game) {
  return Games[game.id].gameStateIsSolveFunction;
}

export function pathologySolveState(gameState: GameState) {
  return gameState.board[gameState.pos.y][gameState.pos.x].tileType === TileType.End;
}

export function sokobanSolveState(gameState: GameState) {
  // check that each end tile has a box on it
  // get all end tile positions

  const endTilePositions = gameState.board
    .map((row, y) => row.map((tile, x) => ({ tile, x, y })))
    .flat()
    .filter(({ tile }) => (tile.tileType === TileType.End || tile.tileType === TileType.BlockOnExit));

  // check that each end tile has a Block on it
  return endTilePositions.length > 0 && endTilePositions.every(({ x, y }) => {
    return gameState.board[y][x].block !== undefined;
  });
}
