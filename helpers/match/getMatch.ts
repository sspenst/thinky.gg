import { GameId } from '@root/constants/GameId';
import User from '@root/models/db/user';
import { getAllMatches } from '@root/pages/api/match';

export async function getMatch(gameId: GameId, matchId: string, reqUser?: User) {
  // populate players, winners, and levels
  const matches = await getAllMatches(gameId, reqUser, { matchId: matchId });

  if (matches.length === 0) {
    return null;
  }

  return matches[0];
}
