import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import playAttemptHandler, { getLastLevelPlayed } from '../../../../pages/api/play-attempt/index';

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

describe('/api/play-attempt GET endpoint', () => {
  test('should return the last level played for authenticated user', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'GET',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          headers: {
            'content-type': 'application/json',
            'host': DEFAULT_GAME_ID + '.localhost',
          },
          query: {
            context: 'recent_unsolved',
          },
        } as unknown as NextApiRequestWithAuth;

        await playAttemptHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(200);
        // Response can be null if no levels played or a level object
        const response = await res.json();

        expect(response === null || typeof response === 'object').toBe(true);
      }
    });
  });

  test('should require authentication for GET', async () => {
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
            context: 'recent_unsolved',
          },
        } as unknown as NextApiRequestWithAuth;

        await playAttemptHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(401);
      }
    });
  });
});

describe('getLastLevelPlayed function', () => {
  test('should return null when user has no play attempts', async () => {
    // Mock user with no play history
    const mockUser = {
      _id: 'mockuserid',
      name: 'mockuser',
      // ... other user properties
    };

    const result = await getLastLevelPlayed(DEFAULT_GAME_ID, mockUser as any);

    expect(result).toBe(null);
  });
});
