import Direction from '@root/constants/direction';
import { GameState, initGameState, makeMove } from './gameStateHelpers';

export function isValidDirections(directions: unknown) {
  if (!Array.isArray(directions)) {
    return false;
  }

  for (const direction of directions) {
    if (!(direction in Direction)) {
      return false;
    }
  }

  return true;
}

export function directionsToGameState(directions: Direction[], levelData: string): GameState | null {
  const gameState = initGameState(levelData);

  for (const direction of directions) {
    if (!makeMove(gameState, direction)) {
      return null;
    }
  }

  return gameState;
}

export function getCheckpointKey(levelId: string, userId: string) {
  return `${userId}_${levelId}_checkpoints`;
}
