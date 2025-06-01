import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { MultiplayerMatchState, MultiplayerMatchType } from '@root/models/constants/multiplayer';
import { MultiplayerMatchModel } from '@root/models/mongoose';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import head2headHandler, { getHeadToHeadMultiplayerRecord } from '../../../../pages/api/match/head2head';

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

describe('/api/match/head2head', () => {
  describe('getHeadToHeadMultiplayerRecord function', () => {
    test('should return zeros when no matches exist', async () => {
      const userId1 = new Types.ObjectId();
      const userId2 = new Types.ObjectId();

      const result = await getHeadToHeadMultiplayerRecord(DEFAULT_GAME_ID, userId1, userId2);

      expect(result).toEqual({
        totalWins: 0,
        totalTies: 0,
        totalLosses: 0,
      });
    });

    test('should calculate head-to-head record correctly', async () => {
      const userId1 = new Types.ObjectId(TestId.USER);
      const userId2 = new Types.ObjectId(TestId.USER_B);

      // Create some test matches
      await MultiplayerMatchModel.create([
        {
          _id: new Types.ObjectId(),
          gameId: DEFAULT_GAME_ID,
          state: MultiplayerMatchState.FINISHED,
          rated: true,
          players: [userId1, userId2],
          winners: [userId1], // userId1 wins
          type: MultiplayerMatchType.RushBullet,
          private: false,
          matchId: 'testmatch1',
          createdBy: userId1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          gameId: DEFAULT_GAME_ID,
          state: MultiplayerMatchState.FINISHED,
          rated: true,
          players: [userId1, userId2],
          winners: [userId2], // userId2 wins (userId1 loses)
          type: MultiplayerMatchType.RushBullet,
          private: false,
          matchId: 'testmatch2',
          createdBy: userId2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          gameId: DEFAULT_GAME_ID,
          state: MultiplayerMatchState.FINISHED,
          rated: true,
          players: [userId1, userId2],
          winners: [], // tie
          type: MultiplayerMatchType.RushBullet,
          private: false,
          matchId: 'testmatch3',
          createdBy: userId1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await getHeadToHeadMultiplayerRecord(DEFAULT_GAME_ID, userId1, userId2);

      expect(result.totalWins).toBe(1);
      expect(result.totalLosses).toBe(1);
      expect(result.totalTies).toBe(1);

      // Cleanup
      await MultiplayerMatchModel.deleteMany({
        players: { $all: [userId1, userId2] }
      });
    });
  });

  describe('GET /api/match/head2head', () => {
    test('should return head-to-head record for valid players', async () => {
      const userId1 = TestId.USER;
      const userId2 = TestId.USER_B;

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(userId1),
            },
            headers: {
              'content-type': 'application/json',
              'host': DEFAULT_GAME_ID + '.localhost',
            },
            query: {
              players: `${userId1},${userId2}`,
            },
          } as unknown as NextApiRequestWithAuth;

          await head2headHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(200);
          expect(response).toHaveProperty('totalWins');
          expect(response).toHaveProperty('totalTies');
          expect(response).toHaveProperty('totalLosses');
          expect(typeof response.totalWins).toBe('number');
          expect(typeof response.totalTies).toBe('number');
          expect(typeof response.totalLosses).toBe('number');
        }
      });
    });

    test('should require authentication', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'GET',
            cookies: {},
            headers: {
              'content-type': 'application/json',
              'host': DEFAULT_GAME_ID + '.localhost',
            },
            query: {
              players: `${TestId.USER},${TestId.USER_B}`,
            },
          } as unknown as NextApiRequestWithAuth;

          await head2headHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(401);
        }
      });
    });
  });
});
