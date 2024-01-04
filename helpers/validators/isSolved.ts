import TileType from '@root/constants/tileType';
import { GameState } from '@root/helpers/gameStateHelpers';

export function isSolvedPathology(gameState: GameState) {
  return gameState.board[gameState.pos.y][gameState.pos.x].tileType === TileType.Exit;
}

export function isSolvedSokoban(gameState: GameState) {
  return gameState.board.every(row => row.every(tileState => {
    // all goals must have a box on them
    return tileState.tileType === TileType.Exit ? tileState.block !== undefined : true;
  }));
}
