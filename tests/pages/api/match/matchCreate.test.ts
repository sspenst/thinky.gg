import { GameId } from '@root/constants/GameId';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { MultiplayerMatchType } from '../../../../models/constants/multiplayer';
import MultiplayerMatch from '../../../../models/db/multiplayerMatch';
import handler from '../../../../pages/api/match/index';

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
    type: MultiplayerMatchType.RushBullet,
    private: false,
    rated: true,

  },
  headers: {
    'content-type': 'application/json',
  },
};

describe('matchCreate', () => {
  test('GET the match when not in one should return empty', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        await handler({
          ...defaultReq,
          method: 'GET',
        }, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(res.status).toBe(200);
        expect(response).toHaveLength(0);
      },
    });
  });
  test('POST should create OK', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        await handler({
          ...defaultReq
        }, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response.matchId).toHaveLength(11);
      },
    });
  });
  test('POST a second time should fail (already in match)', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        await handler({
          ...defaultReq
        }, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('You are already involved in a match');
        expect(res.status).toBe(400);
      },
    });
  });
  test('GET my active matches', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        await handler({
          ...defaultReq,
          method: 'GET',
        }, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);
        expect(response).toHaveLength(1);
        const match = response[0] as MultiplayerMatch;

        expect(match.gameId).toBe(GameId.PATHOLOGY);
        expect(match.matchId).toHaveLength(11);
        expect(match.winners).toHaveLength(0);
        expect(match.levels).toHaveLength(0);
        expect(match.players).toHaveLength(1);
        expect(match.createdBy).toBeDefined();
        const createdByFields = Object.keys(match.createdBy);

        expect(match.createdBy.name).toBe('test');
        expect(createdByFields.sort()).toStrictEqual(['_id', 'last_visited_at', 'name', 'roles'].sort());
        const sample_player = match.players[0];

        expect(sample_player._id).toBe(TestId.USER);
        const sample_player_fields = Object.keys(sample_player);

        expect(sample_player_fields.sort()).toStrictEqual(['_id', 'last_visited_at', 'name', 'roles'].sort());
      },
    });
  });
});
