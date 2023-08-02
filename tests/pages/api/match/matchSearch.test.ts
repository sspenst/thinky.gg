import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { MultiplayerMatchModel } from '@root/models/mongoose';
import { MultiplayerMatchType } from '@root/models/MultiplayerEnums';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import handler from '../../../../pages/api/match/search';

afterEach(() => {
  jest.restoreAllMocks();
});
beforeAll(async () => {
  await dbConnect();
  await MultiplayerMatchModel.create({
    matchId: new Types.ObjectId(),
    createdBy: TestId.USER,
    players: [TestId.USER, TestId.USER_B],
    private: false,
    rated: true,
    state: 'FINISHED',
    type: MultiplayerMatchType.RushBullet,
    winners: [TestId.USER],
    losers: [TestId.USER_B],
    draw: false,
  });
  await MultiplayerMatchModel.create({
    matchId: new Types.ObjectId(),
    createdBy: TestId.USER_B,
    players: [TestId.USER_B, TestId.USER_C],
    private: false,
    rated: true,
    state: 'FINISHED',
    type: MultiplayerMatchType.RushBlitz,
    winners: [TestId.USER_B],
    losers: [TestId.USER_B],
    draw: false,
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
  query: {

  },
  headers: {
    'content-type': 'application/json',
  },
};

describe('/api/match/search', () => {
  // create two multiplayer matches
  // one with user1 and user2

  test('Trying to GET', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);

        expect(response).toHaveLength(2);
        const first = response[0];
        const second = response[1];

        expect(first).toHaveProperty('type', MultiplayerMatchType.RushBullet);
        expect(second).toHaveProperty('type', MultiplayerMatchType.RushBlitz);
      },
    });
  });
  test('Trying to GET filter player', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          ...DefaultReq,
          query: {
            players: TestId.USER_C.toString(),
          }
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(res.status).toBe(200);

        expect(response).toHaveLength(1);
        const first = response[0];

        expect(first).toHaveProperty('type', MultiplayerMatchType.RushBlitz);
        expect(first.players).toHaveLength(2);
        expect(first.players[0]._id.toString()).toBe(TestId.USER_B.toString());
        expect(first.players[1]._id.toString()).toBe(TestId.USER_C.toString());
      },
    });
  });
});
