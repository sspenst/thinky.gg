import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import Role from '@root/constants/role';
import TestId from '@root/constants/testId';
import { logger } from '@root/helpers/logger';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserModel } from '@root/models/mongoose';
import connectedUsersHandler from '@root/pages/api/admin/connected-users';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

enableFetchMocks();

describe('api/admin/connected-users', () => {
  // Mock logger to avoid console spam during tests
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

  test('should return 401 for non-admin user', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER) // Regular user, not admin
          },
          body: {
            userId: TestId.USER,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await connectedUsersHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Not authorized');
        expect(res.status).toBe(401);
      },
    });
  });

  test('should return empty data for user with no IP addresses', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN)
          },
          body: {
            userId: TestId.USER_ADMIN,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await connectedUsersHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.users).toEqual([]);
        expect(response.distinctIPs).toEqual([]);
        expect(response.distinctEmailDomains).toEqual([]);
        expect(response.numUsers).toBe(0);
        expect(response.numDistinctIPs).toBe(0);
        expect(response.numDistinctEmailDomains).toBe(0);
        expect(res.status).toBe(200);
      },
    });
  });

  test('should return connected users with email domains', async () => {
    // Create test users with shared IP addresses and different email domains
    const testUserId1 = new Types.ObjectId();
    const testUserId2 = new Types.ObjectId();
    const sharedIP = '192.168.1.100';

    await UserModel.create([
      {
        _id: testUserId1,
        name: 'TestUser1',
        email: 'user1@example.com',
        password: 'password',
        roles: [],
        ip_addresses_used: [sharedIP],
      },
      {
        _id: testUserId2,
        name: 'TestUser2',
        email: 'user2@test.org',
        password: 'password',
        roles: [],
        ip_addresses_used: [sharedIP],
      },
    ]);

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN)
          },
          body: {
            userId: testUserId1.toString(),
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await connectedUsersHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBeUndefined();
        expect(response.users).toHaveLength(2);
        expect(response.distinctIPs).toContain(sharedIP);
        expect(response.distinctEmailDomains).toContain('example.com');
        expect(response.distinctEmailDomains).toContain('test.org');
        expect(response.numUsers).toBe(2);
        expect(response.numDistinctIPs).toBe(1);
        expect(response.numDistinctEmailDomains).toBe(2);
        expect(res.status).toBe(200);
      },
    });

    // Cleanup test users
    await UserModel.deleteMany({ _id: { $in: [testUserId1, testUserId2] } });
  });

  test('should handle invalid user ID', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER_ADMIN)
          },
          body: {
            userId: 'invalid-id',
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await connectedUsersHandler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Invalid body.userId');
        expect(res.status).toBe(400);
      },
    });
  });
});
