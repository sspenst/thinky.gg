import { GameType } from '@root/constants/Games';
import { EnrichedLevel } from '@root/models/db/level';
import { getGameFromId } from './getGameIdFromReq';

export default function getLevelCompleteColor(level: EnrichedLevel | undefined) {
  if (level?.userMoves === undefined) {
    return undefined;
  }

  const game = getGameFromId(level.gameId);

  if (level.userMoves !== level.leastMoves && game.type === GameType.SHORTEST_PATH) {
    return 'var(--color-incomplete)';
  }

  return 'var(--color-complete)';
}
