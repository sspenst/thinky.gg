import { MatchAction, MatchLogDataUserLeveId, MultiplayerMatchState } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';

export function getLevelIndexByPlayerId(match: MultiplayerMatch | undefined | null, playerId: string): number {
  if (!match || !(playerId in match.scoreTable)) {
    return -1;
  }

  let levelIndex = match.scoreTable[playerId];

  // account for skip
  if (match.matchLog?.some(log => log.type === MatchAction.SKIP_LEVEL && (log.data as MatchLogDataUserLeveId).userId.toString() === playerId)) {
    levelIndex += 1;
  }

  return levelIndex;
}

export function getPrettyMatchState(state: MultiplayerMatchState): string {
  const stateMap = {
    [MultiplayerMatchState.OPEN]: 'Match Open',
    [MultiplayerMatchState.FINISHED]: 'Match Finished',
    [MultiplayerMatchState.ACTIVE]: 'Match about to begin',
    [MultiplayerMatchState.ABORTED]: 'Match Aborted',
  };

  return stateMap[state] || 'Unknown State';
}

export function isMatchInProgress(match: MultiplayerMatch | undefined | null): boolean {
  return match?.state === MultiplayerMatchState.ACTIVE && (match?.timeUntilStart || 0) <= 0;
}

export function isPlayerPlaying(match: MultiplayerMatch | undefined | null, userId?: string): boolean {
  return Boolean(match?.players.some(player => player._id.toString() === userId));
}

export function isSpectating(match: MultiplayerMatch | undefined | null, userId?: string): boolean {
  return !isPlayerPlaying(match, userId) && match?.state === MultiplayerMatchState.ACTIVE;
}
