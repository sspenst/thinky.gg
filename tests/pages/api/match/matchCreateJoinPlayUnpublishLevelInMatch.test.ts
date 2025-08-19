import Direction from '@root/constants/direction';
import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import { enableFetchMocks } from 'jest-fetch-mock';
import MockDate from 'mockdate';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import { MatchAction, MultiplayerMatchState, MultiplayerMatchType } from '../../../../models/constants/multiplayer';
import Level from '../../../../models/db/level';
import MultiplayerMatch from '../../../../models/db/multiplayerMatch';
import { LevelModel, MultiplayerMatchModel, StatModel } from '../../../../models/mongoose';
import handler from '../../../../pages/api/match/[matchId]';
import handlerCreate from '../../../../pages/api/match/index';
import statHandler from '../../../../pages/api/stats/index';
import unpublishLevelHandler from '../../../../pages/api/unpublish/[id]';

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

describe('matchUnpublishLevelInMatch', () => {
  let matchId = '';
  const jan1 = new Date('2022-01-01T00:00:00.000Z');

  MockDate.set(jan1);

  test('create match', async () => {
    await StatModel.deleteMany({}); // clear stats
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
          expect(Object.keys(player).sort()).toEqual([ '_id', 'config', 'last_visited_at', 'name', 'roles'].sort());
        }

        expect(response.gameTable).toBeUndefined();
        expect(response.matchLog).toBeUndefined();
        expect(response.state).toBe(MultiplayerMatchState.ACTIVE);
        expect(response.type).toBe(MultiplayerMatchType.RushBullet);
        expect(response.levels).toHaveLength(0);
        expect(response.winners).toHaveLength(0);
        expect(response.timeUntilStart).toBe(600000);
        expect(response.timeUntilEnd).toBe(600000 + 1000 * 60 * 3); // 3 minutes + 15 seconds
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
        });
        expect(response.winners).toHaveLength(0);
        expect(response.timeUntilStart).toBe(600000 - 2000);
        expect(response.levels).toHaveLength(0); // should hide
      }

    });
  });
  test('Player A marks themselves ready', async () => {
  await testApiHandler({
    pagesHandler: async (_, res) => {
      await handler({
        ...defaultReq,
        method: 'PUT',
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        },
        query: {
          matchId: matchId,
        },
        body: {
          action: MatchAction.MARK_READY,
        },
      }, res);
    },
    test: async ({ fetch }) => {
      const res = await fetch();
      const response = await res.json();

      expect(res.status).toBe(200);
      expect(response.success).toBe(true);
    },
  });
  }),
  test('in between no levels still generated', async () => {
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
        });
        expect(response.winners).toHaveLength(0);
        expect(response.timeUntilStart).toBe(600000 - 2000 - 2000);
        expect(response.levels).toHaveLength(0); // should hide
      }

    });
  });
  test('Player B marks themselves ready', async () => {
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
            action: MatchAction.MARK_READY,
          },
        }, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.success).toBe(true);
      },
    });
    }),
  test('GET match from a spectator after both players mark ready (match should have started', async () => {
    // Now the start time should be set to 3 seconds from now. let's fast forward 4 seconds

    MockDate.set(new Date().getTime() + 4000); // four seconds later

    await testApiHandler({
      pagesHandler: async (_, res) => {
        await handler({
          ...defaultReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER_C),
          },
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
        expect(response.scoreTable).toEqual({
          [TestId.USER]: 0,
          [TestId.USER_B]: 0,
        });
        expect(response.levels).toHaveLength(6); // should have all levels for the match since spectating
        expect(response.state).toBe(MultiplayerMatchState.ACTIVE);
        //expect(Object.keys(response.levels[0]).sort()).toEqual(['_id', 'calc_difficulty_completion_estimate', 'calc_playattempts_unique_users', 'calc_playattempts_unique_users_count', 'calc_playattempts_unique_users_count_excluding_author', 'calc_difficulty_estimate', 'complete', 'gameId', 'userId', 'data', 'width', 'height', 'leastMoves', 'name', 'slug', 'isRanked'].sort());
      }

    });
  });
  test('GET match from one of the players after both players mark ready (match should have started', async () => {
    // Now the start time should be set to 3 seconds from now. let's fast forward 4 seconds

    await testApiHandler({
      pagesHandler: async (_, res) => {
        await handler({
          ...defaultReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
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
        expect(response.scoreTable).toEqual({
          [TestId.USER]: 0,
          [TestId.USER_B]: 0,
        });
        expect(response.levels).toHaveLength(1); // should have level for this user now
        expect(response.state).toBe(MultiplayerMatchState.ACTIVE);
        //expect(Object.keys(response.levels[0]).sort()).toEqual(['_id', 'calc_difficulty_completion_estimate', 'calc_playattempts_unique_users', 'calc_playattempts_unique_users_count', 'calc_playattempts_unique_users_count_excluding_author', 'calc_difficulty_estimate', 'complete', 'gameId', 'userId', 'data', 'width', 'height', 'leastMoves', 'name', 'slug', 'isRanked'].sort());
      }

    });
  });
  test('play match', async () => {
    MockDate.set(new Date().getTime() + 2000); // two seconds later

    const match = await MultiplayerMatchModel.findOne({ matchId: matchId });

    expect(match.state).toBe(MultiplayerMatchState.ACTIVE);
    const levels = match.levels;

    expect(levels).toHaveLength(6); // 3 + (since it is less than 40 levels) 3 pendings

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

    expect(levels).toHaveLength(6); // see 3+3 comment above
    
    // Store the level USER (TestId.USER) is currently on (should be the second level, index 1)
    const userCurrentLevelIndex = 1; // User A completed level 0, now on level 1
    const userCurrentLevel = levels[userCurrentLevelIndex];
    
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
    
    // Verify that the skip was recorded correctly
    const updatedMatch = await MultiplayerMatchModel.findOne({ matchId: matchId });
    const userGameTable = updatedMatch.gameTable.get(TestId.USER);
    
    // Should have 2 entries: the completed level and the skip marker
    expect(userGameTable).toHaveLength(2);
    expect(userGameTable[0].toString()).toBe(levels[0]._id.toString()); // First completed level
    expect(userGameTable[1].toString()).toBe('000000000000000000000000'); // Skip marker
    
    // Check the match log to verify the correct level was marked as skipped
    const skipLogEntry = updatedMatch.matchLog.find((log: any) => log.type === MatchAction.SKIP_LEVEL && log.data.userId.toString() === TestId.USER);
    expect(skipLogEntry).toBeDefined();
    expect(skipLogEntry.data.levelId.toString()).toBe(userCurrentLevel._id.toString());
    
    // Check chat messages for the skip action
    const skipChatMessage = updatedMatch.chatMessages[updatedMatch.chatMessages.length - 1];
    expect(skipChatMessage.systemData.type).toBe('level_action');
    expect(skipChatMessage.systemData.action).toBe('skipped');
    expect(skipChatMessage.systemData.level._id.toString()).toBe(userCurrentLevel._id.toString());
  });
  test('user A completes another level then skips (verifying skip records correct level)', async () => {
    MockDate.set(new Date().getTime() + 2000); // two seconds later
    
    const match = await MultiplayerMatchModel.findOne({ matchId: matchId });
    const levels = match.levels;
    
    // User A should be on level 2 now (after completing level 0 and skipping level 1)
    // Let's have them complete level 2
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PUT',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            directions: [Direction.RIGHT],
            levelId: levels[2]._id, // Complete level at index 2
            matchId: matchId,
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
    
    // Now User A is on level 3, let's skip it
    const userACurrentLevel = levels[3];
    
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

        expect(res.status).toBe(400);
        expect(response.error).toBe('Already used skip'); // User A already used their skip
      }
    });
  });
  
  test('user B skips their first level', async () => {
    MockDate.set(new Date().getTime() + 2000); // two seconds later

    const match = await MultiplayerMatchModel.findOne({ matchId: matchId });
    const levels = match.levels;
    
    // User B is on their first level (index 0)
    const userBCurrentLevelIndex = 0;
    const userBCurrentLevel = levels[userBCurrentLevelIndex];
    
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
    
    // Verify that User B's skip was recorded correctly
    const updatedMatch = await MultiplayerMatchModel.findOne({ matchId: matchId });
    const userBGameTable = updatedMatch.gameTable.get(TestId.USER_B);
    
    // Should have 1 entry: just the skip marker
    expect(userBGameTable).toHaveLength(1);
    expect(userBGameTable[0].toString()).toBe('000000000000000000000000'); // Skip marker
    
    // Check the match log to verify the correct level was marked as skipped for User B
    const skipLogEntry = updatedMatch.matchLog.find((log: any) => log.type === MatchAction.SKIP_LEVEL && log.data.userId.toString() === TestId.USER_B);
    expect(skipLogEntry).toBeDefined();
    expect(skipLogEntry.data.levelId.toString()).toBe(userBCurrentLevel._id.toString());
    
    // Check chat messages for User B's skip action
    const chatMessages = updatedMatch.chatMessages;
    const userBSkipMessage = chatMessages.find((msg: any) => 
      msg.systemData && 
      msg.systemData.type === 'level_action' && 
      msg.systemData.userId === TestId.USER_B &&
      msg.systemData.action === 'skipped'
    );
    expect(userBSkipMessage).toBeDefined();
    expect(userBSkipMessage.systemData.level._id.toString()).toBe(userBCurrentLevel._id.toString());
  });
  
  test('user B match skip via api again', async () => {
    MockDate.set(new Date().getTime() + 2000); // two seconds later

    const match = await MultiplayerMatchModel.findOne({ matchId: matchId });

    expect(match.state).toBe(MultiplayerMatchState.ACTIVE);
    const levels = match.levels;

    expect(levels).toHaveLength(6); // see 3+3 comment above
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
            action: MatchAction.SKIP_LEVEL
          }
        }, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(400);
        expect(response.error).toBe('Already used skip');
      }
    });
  });
  let levelThatWeWillWantToTestDeletionFor: Level;

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
        expect(response.scoreTable).toEqual({
          [TestId.USER]: 2,  // User A completed level 0 and level 2 (skipped level 1)
          [TestId.USER_B]: 0, // User B skipped level 0
        });
        expect(response.winners).toHaveLength(0);

        expect(response.levels).toHaveLength(1);
        levelThatWeWillWantToTestDeletionFor = response.levels[0] as Level;
      }
    });
  });
  test('UNPUBLISH a level that is in the middle of a game!', async () => {
    expect(levelThatWeWillWantToTestDeletionFor.userId).toBeDefined();
    await testApiHandler({
      pagesHandler: async (_, res) => {
        await unpublishLevelHandler({
          ...defaultReq,
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(levelThatWeWillWantToTestDeletionFor.userId._id.toString()),
          },
          query: {
            id: levelThatWeWillWantToTestDeletionFor._id.toString(),
          },
        }, res);
      }, test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
      }
    });
  });
  test('GET match behalf of USER 1 AFTER level was unpublished', async () => {
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
          [TestId.USER]: 2,  // User A completed level 0 and level 2 (skipped level 1)
          [TestId.USER_B]: 0, // User B skipped level 0
        });
        expect(response.winners).toHaveLength(0);

        expect(response.levels).toHaveLength(1);
        expect(response.state).toBe(MultiplayerMatchState.ABORTED);
        const match = await MultiplayerMatchModel.findOne({ matchId: matchId });

        expect(match.matchLog).toHaveLength(7); // create, join, A complete, A skip, A complete2, B skip, aborted
        expect(match.matchLog[6].type).toBe(MatchAction.ABORTED);
        expect(match.matchLog[6].data.log).toBe('The level ' + levelThatWeWillWantToTestDeletionFor._id.toString() + ' was unpublished');
      }
    });
  });
});
