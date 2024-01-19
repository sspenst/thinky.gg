import TileType from '@root/constants/tileType';
import { GameState } from '@root/helpers/gameStateHelpers';

export function isCompletePathology(gameState: GameState) {
  return gameState.board[gameState.pos.y][gameState.pos.x].tileType === TileType.Exit;
}

export function isCompleteSokopath(gameState: GameState) {
  let exitCount = 0;

  // loop through all tiles
  for (const row of gameState.board) {
    for (const tileState of row) {
      if (tileState.tileType === TileType.Exit) {
        // all goals must have a box on them
        if (tileState.block === undefined) {
          return false;
        } else {
          exitCount++;
        }
      }
    }
  }

  // an exit must exist to be solveable (needed for tutorial)
  return exitCount > 0;
}
