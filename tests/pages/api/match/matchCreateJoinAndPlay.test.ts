import Direction from '@root/constants/direction';
import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import MultiplayerMatch from '../../../../models/db/multiplayerMatch';
import { LevelModel, MultiplayerMatchModel, StatModel } from '../../../../models/mongoose';
import { MatchAction, MultiplayerMatchState, MultiplayerMatchType } from '../../../../models/MultiplayerEnums';
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
          expect(Object.keys(player).sort()).toEqual(['__v', '_id', 'calc_levels_created_count', 'calc_records', 'chapterUnlocked', 'last_visited_at', 'name', 'roles', 'score', 'ts'].sort());
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
        expect(response.timeUntilStart).toBe(13000);
        expect(response.levels).toHaveLength(0); // should hide
      }

    });
  });
  test('GET match after match starts', async () => {
    MockDate.set(new Date().getTime() + 14000); // 14 seconds later
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
        expect(Object.keys(response.levels[0]).sort()).toEqual(['_id', 'calc_playattempts_unique_users', 'calc_playattempts_unique_users_count', 'calc_difficulty_estimate', 'userId', 'data', 'width', 'height', 'leastMoves', 'name', 'slug'].sort());
      }

    });
  });
  test('play match', async () => {
    MockDate.set(new Date().getTime() + 2000); // two seconds later

    const match = await MultiplayerMatchModel.findOne({ matchId: matchId });

    expect(match.state).toBe(MultiplayerMatchState.ACTIVE);
    const levels = match.levels;

    expect(levels).toHaveLength(3);

    // need to mock validate solution so it doesn't fail
    // ../../../../pages/api/stats/index has a function validateSolution that needs to be mocked

    await testApiHandler({
      handler: async (_, res) => {
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
        const mock = jest.requireActual('../../../../helpers/validateSolution'); // import and retain the original functionalities

        jest.spyOn(mock, 'default').mockImplementation(() => {
          return true;
        });
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
    const checkReturn = await checkForFinishedMatch(matchId); // should return null

    expect(checkReturn).not.toBeNull();
    expect(checkReturn?.matchId).toBe(matchId);

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
    const checkReturn = await checkForFinishedMatch(matchId); // should return null

    expect(checkReturn).toBeNull();

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
