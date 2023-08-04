import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { MultiplayerMatchModel } from '@root/models/mongoose';
import { MultiplayerMatchState, MultiplayerMatchType } from '@root/models/MultiplayerEnums';
import { enableFetchMocks } from 'jest-fetch-mock';
import mongoose, { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import handler from '../../../../pages/api/match/record';

afterEach(() => {
  jest.restoreAllMocks();
});
beforeAll(async () => {
  await dbConnect();
  await MultiplayerMatchModel.create({
    matchId: 'abc',
    createdBy: TestId.USER,
    players: [new Types.ObjectId(TestId.USER), new Types.ObjectId(TestId.USER_B)],
    private: false,
    rated: true,
    state: MultiplayerMatchState.FINISHED,
    type: MultiplayerMatchType.RushBullet,
    winners: [new mongoose.Types.ObjectId(TestId.USER)],
  });
  await MultiplayerMatchModel.create({
    matchId: 'def',
    createdBy: TestId.USER_B,
    players: [new Types.ObjectId(TestId.USER_B), new Types.ObjectId(TestId.USER_C)],
    private: false,
    rated: true,
    state: MultiplayerMatchState.FINISHED,
    type: MultiplayerMatchType.RushBlitz,
    winners: [new Types.ObjectId(TestId.USER_B)],
  });
  await MultiplayerMatchModel.create({
    matchId: 'ghi',
    createdBy: TestId.USER,
    players: [new Types.ObjectId(TestId.USER), new Types.ObjectId(TestId.USER_B)],
    private: false,
    rated: true,
    state: MultiplayerMatchState.FINISHED,
    type: MultiplayerMatchType.RushBullet,
    winners: [], // tie
  });
});

afterAll(async () => {
  await dbDisconnect();
});
enableFetchMocks();

const DefaultReq = {
  method: 'GET',
  cookies: {
    token: getTokenCookieValue(TestId.USER),
  },

  headers: {
    'content-type': 'application/json',
  },
};

describe('/api/match/record', () => {
  // create two multiplayer matches
  // one with user1 and user2

  test('Trying to GET', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          query: {
            player: TestId.USER,
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);

        expect(response).toStrictEqual({
          [ MultiplayerMatchType.RushBullet]: {
            draws: 1,
            losses: 0,
            wins: 1,
          }
        });
      },
    });
  });
});