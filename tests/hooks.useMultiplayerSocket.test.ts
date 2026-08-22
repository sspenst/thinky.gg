import {
  filterTerminalMatches,
  MultiplayerSocket,
  reconcileMatchBroadcast,
  rememberTerminalMatch,
} from '@root/hooks/useMultiplayerSocket';
import { MultiplayerMatchState } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';

function createMatch(
  matchId: string,
  state: MultiplayerMatchState,
  isPrivate = false,
): MultiplayerMatch {
  return {
    matchId,
    private: isPrivate,
    state,
  } as unknown as MultiplayerMatch;
}

function createSocketState(
  matches: MultiplayerMatch[],
  privateAndInvitedMatches: MultiplayerMatch[] = [],
): MultiplayerSocket {
  return {
    connectedPlayers: [],
    connectedPlayersCount: 0,
    matches,
    privateAndInvitedMatches,
    socket: undefined,
  };
}

describe('reconcileMatchBroadcast', () => {
  test('removes an aborted match from every redirect candidate list', () => {
    const stalePublicMatch = createMatch('stale-match', MultiplayerMatchState.ACTIVE);
    const stalePrivateMatch = createMatch('stale-match', MultiplayerMatchState.ACTIVE, true);
    const state = createSocketState([stalePublicMatch], [stalePrivateMatch]);

    const updatedState = reconcileMatchBroadcast(
      state,
      createMatch('stale-match', MultiplayerMatchState.ABORTED),
    );

    expect(updatedState.matches).toEqual([]);
    expect(updatedState.privateAndInvitedMatches).toEqual([]);
  });

  test('removes a finished private match without disturbing other matches', () => {
    const publicMatch = createMatch('public-match', MultiplayerMatchState.ACTIVE);
    const privateMatch = createMatch('private-match', MultiplayerMatchState.ACTIVE, true);
    const state = createSocketState([publicMatch], [privateMatch]);

    const updatedState = reconcileMatchBroadcast(
      state,
      createMatch('private-match', MultiplayerMatchState.FINISHED, true),
    );

    expect(updatedState.matches).toEqual([publicMatch]);
    expect(updatedState.privateAndInvitedMatches).toEqual([]);
  });

  test('ignores ongoing per-match updates so routine broadcasts do not churn lobby state', () => {
    const staleMatch = createMatch('match', MultiplayerMatchState.OPEN);
    const state = createSocketState([staleMatch]);
    const activePrivateMatch = createMatch('match', MultiplayerMatchState.ACTIVE, true);

    const updatedState = reconcileMatchBroadcast(state, activePrivateMatch);

    expect(updatedState).toBe(state);
  });

  test('keeps terminal removal monotonic across later stale lobby snapshots', () => {
    const terminalMatchIds = new Set<string>();
    const abortedMatch = createMatch('stale-match', MultiplayerMatchState.ABORTED);
    const unrelatedMatch = createMatch('other-match', MultiplayerMatchState.OPEN);

    rememberTerminalMatch(terminalMatchIds, abortedMatch);

    const stalePublicSnapshot = [
      createMatch('stale-match', MultiplayerMatchState.ACTIVE),
      unrelatedMatch,
    ];
    const stalePrivateSnapshot = [
      createMatch('stale-match', MultiplayerMatchState.ACTIVE, true),
    ];

    expect(filterTerminalMatches(stalePublicSnapshot, terminalMatchIds)).toEqual([unrelatedMatch]);
    expect(filterTerminalMatches(stalePrivateSnapshot, terminalMatchIds)).toEqual([]);
  });

  test('allows a match ID again after a new socket lifecycle replaces its tombstones', () => {
    const terminalMatchIds = new Set<string>();
    const finishedMatch = createMatch('reused-match', MultiplayerMatchState.FINISHED);

    rememberTerminalMatch(terminalMatchIds, finishedMatch);

    const reusedMatch = createMatch('reused-match', MultiplayerMatchState.OPEN);
    const nextSocketLifecycleIds = new Set<string>();
    const reusedMatchSnapshot = [reusedMatch];

    expect(filterTerminalMatches([reusedMatch], terminalMatchIds)).toEqual([]);
    expect(filterTerminalMatches(reusedMatchSnapshot, nextSocketLifecycleIds))
      .toBe(reusedMatchSnapshot);
  });

  test('accepts a minimal lobby terminal event and avoids churn when already removed', () => {
    const state = createSocketState([]);

    const updatedState = reconcileMatchBroadcast(state, {
      matchId: 'terminal-match',
      state: MultiplayerMatchState.FINISHED,
    });

    expect(updatedState).toBe(state);
  });
});
