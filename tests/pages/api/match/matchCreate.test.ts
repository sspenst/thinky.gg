import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
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

describe('matchCreate', () => {
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
  test('GET the match', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        await handler({
          ...defaultReq,
          method: 'GET',
          state: 'OPEN',
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
});
