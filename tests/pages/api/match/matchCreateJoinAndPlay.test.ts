import Direction from '@root/constants/direction';
import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import { UserWithMultiplayerProfile } from '@root/models/db/user';
import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { MatchAction, MultiplayerMatchState, MultiplayerMatchType } from '../../../../models/constants/multiplayer';
import MultiplayerMatch from '../../../../models/db/multiplayerMatch';
import { LevelModel, MultiplayerMatchModel, MultiplayerProfileModel, StatModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/match/[matchId]';
import handlerCreate, { checkForFinishedMatch } from '../../../../pages/api/match/index';
import statHandler from '../../../../pages/api/stats/index';

beforeAll(async () => {
  await dbConnect();
  await StatModel.deleteMany({}); // Just so we get the fields deterministically
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

describe('matchCreateJoinAndPlay', () => {
  let matchId = '';
  const jan1 = new Date('2022-01-01T00:00:00.000Z');

  MockDate.set(jan1);

  test('create match', async () => {
    const levelsUpdated = await LevelModel.updateMany({ isDeleted: { $ne: true }, isDraft: false }, { $set: { calc_reviews_score_laplace: 0.7, leastMoves: 10, calc_difficulty_estimate: 40, calc_reviews_count: 5 } }); // setting the level score to 0.7 so they get selected

    expect(levelsUpdated.modifiedCount).toBe(3);
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
        expect(new Date(response.createdAt)).toEqual(jan1);
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
    MockDate.set(new Date().getTime() + 1000); // one second later
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
        expect(response.timeUntilStart).toBe(15000);
        expect(response.timeUntilEnd).toBe(195000); // 3 minutes + 15 seconds
        expect(response.private).toBe(false);
        expect(response.rated).toBe(true);
        expect(response.scoreTable).toEqual({});
      },
    });
  });
  test('GET match before match starts', async () => {
    MockDate.set(new Date().getTime() + 2000); // two seconds later
    await testApiHandler({
      pagesHandler: async (_, res) => {
        await handler({
          ...defaultReq,
          method: 'GET',
          query: {
            matchId: matchId,
          },
        }, res);
      }, test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json() as MultiplayerMatch;

        expect(response.matchId).toBeDefined();
        expect(response.scoreTable).toEqual({
          [TestId.USER]: 0,
          [TestId.USER_B]: 0,
        });
        expect(response.winners).toHaveLength(0);
        expect(response.timeUntilStart).toBe(13000);
        expect(response.levels).toHaveLength(0); // should hide
      }

    });
  });
  test('GET match after match starts', async () => {
    MockDate.set(new Date().getTime() + 14000); // 14 seconds later
    await testApiHandler({
      pagesHandler: async (_, res) => {
        await handler({
          ...defaultReq,
          method: 'GET',
          query: {
            matchId: matchId,
          },
        }, res);
      }, test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json() as MultiplayerMatch;

        expect(response.matchId).toBeDefined();
        expect(response.scoreTable).toEqual({
          [TestId.USER]: 0,
          [TestId.USER_B]: 0,
        });
        expect(response.winners).toHaveLength(0);
        expect(response.timeUntilStart).toBe(-1000);
        expect(response.levels).toHaveLength(1); // should have level for this user now
        expect(Object.keys(response.levels[0]).sort()).toEqual(['_id', 'calc_difficulty_completion_estimate', 'calc_playattempts_unique_users', 'calc_playattempts_unique_users_count', 'calc_playattempts_unique_users_count_excluding_author', 'calc_difficulty_estimate', 'complete', 'gameId', 'userId', 'data', 'width', 'height', 'leastMoves', 'name', 'slug', 'isRanked'].sort());
      }

    });
  });
  test('play match', async () => {
    MockDate.set(new Date().getTime() + 2000); // two seconds later

    const match = await MultiplayerMatchModel.findOne({ matchId: matchId });

    expect(match.state).toBe(MultiplayerMatchState.ACTIVE);
    const levels = match.levels;

    expect(levels).toHaveLength(6); // When we have less than 40 levels selected we get extra pending levels. So here it should be 3 + 3 levels that are pending
    // expect each level to have a different Id. Loop through and check
    const s = new Set();
    const levelsDeduped = levels.filter((level: Types.ObjectId) => {
      if (s.has(level._id)) {
        return false;
      }

      s.add(level._id);

      return true;
    }
    );

    expect(levelsDeduped).toHaveLength(6); // should be all levels

    // need to mock validate solution so it doesn't fail
    // ../../../../pages/api/stats/index has a function validateSolution that needs to be mocked

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            directions: [Direction.RIGHT],
            levelId: levels[0]._id,
            matchId: matchId, // Here we go
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        Games[DEFAULT_GAME_ID].validateSolution = () => true;
        await statHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
      }
    });
  });
  test('user B match skip via api', async () => {
    MockDate.set(new Date().getTime() + 2000); // two seconds later

    const match = await MultiplayerMatchModel.findOne({ matchId: matchId });

    expect(match.state).toBe(MultiplayerMatchState.ACTIVE);
    const levels = match.levels;

    expect(levels).toHaveLength(6); // see above 3+3 comment
    await testApiHandler({
      pagesHandler: async (_, res) => {
        await handler({
          ...defaultReq,
          method: 'PUT',
          query: {
            matchId: matchId,
          },
          body: {
            action: MatchAction.SKIP_LEVEL
          }
        }, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.error).toBeUndefined();
        expect(response.success).toBe(true);
      }
    });
  });

  test('GET match behalf of USER 1', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        await handler({
          ...defaultReq,
          method: 'GET',
          query: {
            matchId: matchId,
          },
        }, res);
      }, test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json() as MultiplayerMatch;

        expect(response.matchId).toBeDefined();
        expect(response.state).toBe(MultiplayerMatchState.ACTIVE);
        expect(response.scoreTable).toEqual({
          [TestId.USER]: 1,
          [TestId.USER_B]: 0,
        });
        expect(response.winners).toHaveLength(0);

        expect(response.levels).toHaveLength(1);
      }
    });
  });

  test('Wait until end and then get match behalf of USER 1', async () => {
    MockDate.set(new Date().getTime() + 190000); // 3 minutes later
    const [checkReturn, profiles] = await Promise.all([checkForFinishedMatch(matchId), MultiplayerProfileModel.find({ userId: { $in: [TestId.USER, TestId.USER_B] } })]);

    expect(profiles).toHaveLength(0);

    expect(checkReturn).not.toBeNull();
    expect(checkReturn?.matchId).toBe(matchId);

    await testApiHandler({
      pagesHandler: async (_, res) => {
        await handler({
          ...defaultReq,
          method: 'GET',
          query: {
            matchId: matchId,
          },
        }, res);
      }, test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json() as MultiplayerMatch;

        expect(response.matchId).toBeDefined();
        expect(response.scoreTable).toEqual({
          [TestId.USER]: 1,
          [TestId.USER_B]: 0,
        });
        expect(response.winners).toHaveLength(1);

        expect(response.levels).toHaveLength(6); // @TODO: Probably shouldn't return all the levels on finish of match - just need the levels that were played

        // query mutliplayerprofiles
        const multiplayerProfiles = await MultiplayerProfileModel.find({ userId: { $in: [TestId.USER, TestId.USER_B] } });

        expect(multiplayerProfiles).toHaveLength(2);
        expect(multiplayerProfiles[0].gameId).toBe(DEFAULT_GAME_ID);
      }
    });
  });
  test('try to join the completed match and fail', async () => {
    const checkReturn = await checkForFinishedMatch(matchId); // should return null

    expect(checkReturn).toBeNull();

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
        const response = await res.json();

        expect(response.error).toBeDefined();
        expect(response.error).toBe('Match not found or you are already in the match');
      },
    });
  });
});
