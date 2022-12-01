import { ObjectId } from 'bson';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import MultiplayerMatch from '../../../../models/db/multiplayerMatch';
import { MultiplayerMatchState, MultiplayerMatchType } from '../../../../models/MultiplayerEnums';
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
  method: 'POST',
  cookies: {
    token: getTokenCookieValue(TestId.USER),
  },
  body: {

  },
  headers: {
    'content-type': 'application/json',
  },
};

describe('matchJoin', () => {
  let matchId = '';

  test('Create a match', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        await handlerCreate({
          ...defaultReq
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
  test('GET the match with invalid matchId', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        await handler({
          ...defaultReq,
          query: {
            matchId: new ObjectId().toString(),
          },
          method: 'GET',
        }, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(404);
        expect(response.error).toBeDefined();
        expect(response.error).toBe('Match not found');
      },
    });
  });
  test('GET the match with valid matchId', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        await handler({
          ...defaultReq,
          query: {
            matchId: matchId,
          },
          method: 'GET',
        }, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response.error).toBeUndefined();
        expect(response.matchId).toBe(matchId);
      },
    });
  });
  test('Try to join a match you are already in', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        await handler({
          ...defaultReq,
          query: {
            matchId: matchId,
          },
          body: {
            action: 'join',
          },
          method: 'PUT',
        }, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(400);
        expect(response.error).toBeDefined();
        expect(response.error).toBe('You are already involved in a match. Leave that to join this one.');
      },
    });
  });
  test('Another person tries to join', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        await handler({
          ...defaultReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER_B),
          },
          query: {
            matchId: matchId,
          },
          body: {
            action: 'join',
          },
          method: 'PUT',
        }, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        const match = response as MultiplayerMatch;

        expect(match.matchId).toBe(matchId);
        expect(match.startTime).toBeDefined();
        expect(match.timeUntilStart).toBeDefined();
        expect(match.timeUntilStart).toBeGreaterThan(1000); // should be 10 seconds in future
        expect(match.timeUntilStart).toBeLessThan(20000);
      },
    });
  });
});
