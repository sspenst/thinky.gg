import { ObjectId } from 'bson';
import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import MultiplayerMatch from '../../../../models/db/multiplayerMatch';
import { LevelModel, MultiplayerMatchModel } from '../../../../models/mongoose';
import { MatchAction, MultiplayerMatchState, MultiplayerMatchType } from '../../../../models/MultiplayerEnums';
import handler, { MatchMarkCompleteLevel, MatchMarkSkipLevel } from '../../../../pages/api/match/[matchId]';
import handlerCreate, { checkForFinishedMatch } from '../../../../pages/api/match/index';

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

const defaultReq: any = {
  method: 'PUT',
  cookies: {
    token: getTokenCookieValue(TestId.USER),
  },
  body: {

  },
  headers: {
    'content-type': 'application/json',
  },
};

describe('matchQuit', () => {
  let matchId = '';
  const jan1 = new Date('2022-01-01T00:00:00.000Z');

  MockDate.set(jan1);

  test('create match', async () => {
    const levelsUpdated = await LevelModel.updateMany({ isDraft: false }, { $set: { calc_reviews_score_laplace: 0.7, leastMoves: 30, calc_difficulty_estimate: 40, calc_reviews_count: 5 } }); // setting the level score to 0.7 so they get selected

    expect(levelsUpdated.modifiedCount).toBe(3);
    await testApiHandler({
      handler: async (_, res) => {
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
        expect(response.type).toBe(MultiplayerMatchType.ClassicRush);
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
      handler: async (_, res) => {
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
          expect(Object.keys(player).sort()).toEqual(['__v', '_id', 'calc_records', 'last_visited_at', 'name', 'roles', 'score', 'ts'].sort());
        }

        expect(response.gameTable).toBeUndefined();
        expect(response.matchLog).toBeUndefined();
        expect(response.state).toBe(MultiplayerMatchState.ACTIVE);
        expect(response.type).toBe(MultiplayerMatchType.ClassicRush);
        expect(response.levels).toHaveLength(0);
        expect(response.winners).toHaveLength(0);
        expect(response.timeUntilStart).toBe(10000);
        expect(response.timeUntilEnd).toBe(190000); // 3 minutes + 10 seconds
        expect(response.private).toBe(false);
        expect(response.rated).toBe(true);
        expect(response.scoreTable).toEqual({});
      },
    });
  });
  test('GET match before match starts', async () => {
    MockDate.set(new Date().getTime() + 2000); // two seconds second later
    await testApiHandler({
      handler: async (_, res) => {
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
        expect(response.timeUntilStart).toBe(8000);
        expect(response.levels).toHaveLength(0); // should hide
      }

    });
  });
  test('GET match after match starts', async () => {
    MockDate.set(new Date().getTime() + 9000); // nine seconds second later
    await testApiHandler({
      handler: async (_, res) => {
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
        expect(Object.keys(response.levels[0]).sort()).toEqual(['_id', 'calc_difficulty_estimate', 'data', 'width', 'height', 'leastMoves', 'name', 'slug'].sort());
      }

    });
  });
  test('play match', async () => {
    MockDate.set(new Date().getTime() + 2000); // two seconds second later

    const match = await MultiplayerMatchModel.findOne({ matchId: matchId });

    expect(match.state).toBe(MultiplayerMatchState.ACTIVE);
    const levels = match.levels;

    expect(levels).toHaveLength(3);
    await MatchMarkCompleteLevel(new ObjectId(TestId.USER), matchId, levels[0]._id);
  });
  test('user B match skip via api', async () => {
    MockDate.set(new Date().getTime() + 2000); // two seconds second later

    const match = await MultiplayerMatchModel.findOne({ matchId: matchId });

    expect(match.state).toBe(MultiplayerMatchState.ACTIVE);
    const levels = match.levels;

    expect(levels).toHaveLength(3);
    await testApiHandler({
      handler: async (_, res) => {
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
      handler: async (_, res) => {
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
        expect(response.winners).toHaveLength(0);

        expect(response.levels).toHaveLength(1);
      }
    });
  });
  test('Wait until end and then get match behalf of USER 1', async () => {
    MockDate.set(new Date().getTime() + 190000); // 3 minutes later
    await checkForFinishedMatch(matchId);
    await testApiHandler({
      handler: async (_, res) => {
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

        expect(response.levels).toHaveLength(3); // @TODO: Probably shouldn't return all the levels on finish of match - just need the levels that were played
      }
    });
  });
  test('try to join the completed match and fail', async () => {
    await testApiHandler({
      handler: async (_, res) => {
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
