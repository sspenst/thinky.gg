import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { UserWithMultiplayerProfile } from '@root/models/db/user';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { MatchAction, MultiplayerMatchState, MultiplayerMatchType } from '../../../../models/constants/multiplayer';
import MultiplayerMatch from '../../../../models/db/multiplayerMatch';
import handler from '../../../../pages/api/match/[matchId]';
import handlerCreate from '../../../../pages/api/match/index';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

afterEach(() => {
  jest.restoreAllMocks();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultReq: any = {
  method: 'PUT',
  gameId: DEFAULT_GAME_ID,
  cookies: {
    token: getTokenCookieValue(TestId.USER),
  },
  body: {
    type: MultiplayerMatchType.RushBullet,
    private: false,
    rated: true,
  },
  headers: {
    'content-type': 'application/json',
  },
};

describe('matchCreateJoinAndQuit', () => {
  let matchId = '';

  test('create match', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        await handlerCreate({
          ...defaultReq,
          method: 'POST',
        }, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json() as MultiplayerMatch;

        expect(response.matchId).toBeDefined();
        matchId = response.matchId;
        expect(response.createdBy).toBe(TestId.USER);
        expect(response.players).toHaveLength(1);
        expect(response.players[0]).toBe(TestId.USER);
        expect(response.gameTable).toBeUndefined();
        expect(response.matchLog).toBeUndefined();
        expect(response.state).toBe(MultiplayerMatchState.OPEN);
        expect(response.type).toBe(MultiplayerMatchType.RushBullet);
        expect(response.levels).toHaveLength(0);
        expect(response.winners).toHaveLength(0);
        expect(response.timeUntilStart).toBeUndefined();
        expect(response.timeUntilEnd).toBeUndefined();
        expect(response.private).toBe(false);
        expect(response.rated).toBe(true);
        expect(response.scoreTable).toBeUndefined();
      },
    });
  });
  test('join match', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        await handler({
          ...defaultReq,
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            matchId: matchId,
          },
          body: {
            action: MatchAction.JOIN
          }
        }, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json() as MultiplayerMatch;

        expect(response.matchId).toBeDefined();
        matchId = response.matchId;
        expect(response.createdBy).toBe(TestId.USER);
        expect(response.players).toHaveLength(2);

        for (const player of response.players) {
          expect(Object.keys(player).sort()).toEqual(['_id', 'config', 'last_visited_at', 'name', 'roles'].sort());
          expect(player.config).toBeDefined();
          const keys = Object.keys(player?.config || []);

          expect(keys.sort()).toEqual(['_id', 'gameId', 'calcCurrentStreak', 'calcRankedSolves', 'calcLevelsCreatedCount', 'calcLevelsCompletedCount', 'calcLevelsSolvedCount', 'calcRecordsCount', 'roles'].sort());
        }

        for (const winner of response.winners as UserWithMultiplayerProfile[]) {
          expect(Object.keys(winner).sort()).toEqual(['_id', 'config', 'last_visited_at', 'name', 'roles'].sort());
          expect(winner.config).toBeDefined();
          const keys = Object.keys(winner?.config || []);

          expect(keys.sort()).toEqual(['_id', 'gameId', 'calcRankedSolves', 'calcLevelsCompletedCount', 'calcLevelsSolvedCount', 'calcRecordsCount'].sort());
        }

        expect(response.gameTable).toBeUndefined();
        expect(response.matchLog).toBeUndefined();
        expect(response.state).toBe(MultiplayerMatchState.ACTIVE);
        expect(response.type).toBe(MultiplayerMatchType.RushBullet);
        expect(response.levels).toHaveLength(0);
        expect(response.winners).toHaveLength(0);
        expect(response.timeUntilStart).toBeGreaterThan(5000);
        expect(response.timeUntilEnd).toBeGreaterThan(15000);
        expect(response.private).toBe(false);
        expect(response.rated).toBe(true);
        expect(response.scoreTable).toEqual({});
      },
    });
  });
  test('quit match', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        await handler({
          ...defaultReq,
          method: 'PUT',
          query: {
            matchId: matchId,
          },
          body: {
            action: MatchAction.QUIT
          }
        }, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json() as MultiplayerMatch;

        expect(response.matchId).toBeDefined();
        matchId = response.matchId;
        expect(response.createdBy).toBe(TestId.USER);
        expect(response.players).toHaveLength(1);
        expect(response.gameTable).toBeDefined();
        expect(response.gameTable && response.gameTable[TestId.USER]).toHaveLength(0);
        expect(response.matchLog).toHaveLength(3);
        expect(response.matchLog && response.matchLog[2].type).toBe(MatchAction.QUIT);
        expect(response.state).toBe(MultiplayerMatchState.ABORTED);
        expect(response.type).toBe(MultiplayerMatchType.RushBullet);
        expect(response.levels).toHaveLength(3); // NOTE - On 12/4 when introducing the platform we made it so that multiplayer will select pending levels if there is not enough levels in the ecosystem that are not "pending"
        expect(response.winners).toHaveLength(0);
        expect(response.timeUntilStart).toBeGreaterThan(500);
        expect(response.timeUntilEnd).toBeGreaterThan(15000);
        expect(response.private).toBe(false);
        expect(response.rated).toBe(true);
        expect(response.scoreTable).toEqual({
          [TestId.USER]: 0,
          [TestId.USER_B]: 0,
        });
      },
    });
  });
});
