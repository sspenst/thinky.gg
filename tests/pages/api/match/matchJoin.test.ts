import { ObjectId } from 'bson';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
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
        const response = await res.json();

        expect(response.matchId).toBeDefined();
        matchId = response.matchId;
        expect(response.matchLog).toHaveLength(1);
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
        expect(response.error).toBe('Match not found or you are already in the match');
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
