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

enableFetchMocks();

describe('/api/admin/connected-users', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authentication & Authorization', () => {
    test('should return 401 for non-admin user', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER)
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

    test('should return 401 for unauthenticated user', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
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

          expect(response.error).toBe('Unauthorized: No token provided');
          expect(res.status).toBe(401);
        },
      });
    });

    test('should return 400 for invalid userId', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              userId: 'invalidObjectId',
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

  describe('Connected Users Functionality', () => {
    test('should return empty result for user with no IP addresses', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
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

          expect(response.error).toBeUndefined();
          expect(response.users).toEqual([]);
          expect(response.distinctIPs).toEqual([]);
          expect(response.numUsers).toBe(0);
          expect(response.numDistinctIPs).toBe(0);
          expect(res.status).toBe(200);
        },
      });
    });

    test('should handle user with IP addresses that finds connected users', async () => {
      // Set up test data - add IP addresses to test users
      const testIP = '192.168.1.100';

      await UserModel.updateOne(
        { _id: new Types.ObjectId(TestId.USER) },
        { $set: { ip_addresses_used: [testIP] } }
      );

      await UserModel.updateOne(
        { _id: new Types.ObjectId(TestId.USER_B) },
        { $set: { ip_addresses_used: [testIP] } }
      );

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
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

          expect(response.error).toBeUndefined();
          expect(response.users.length).toBeGreaterThanOrEqual(2); // At least both test users (including original)
          expect(response.distinctIPs).toContain(testIP);
          expect(response.numUsers).toBeGreaterThanOrEqual(2);
          expect(response.numDistinctIPs).toBeGreaterThanOrEqual(1);
          expect(res.status).toBe(200);

          // Check that user data structure is correct - Find the connected user
          const connectedUser = response.users.find((u: any) => u._id === TestId.USER_B);

          expect(connectedUser).toBeDefined();
          expect(connectedUser._id).toBe(TestId.USER_B);
          expect(connectedUser.name).toBe('BBB');
          expect(Array.isArray(connectedUser.roles)).toBe(true);

          // Verify the original user IS in the connected users list
          const originalUser = response.users.find((u: any) => u._id === TestId.USER);

          expect(originalUser).toBeDefined();
          expect(originalUser._id).toBe(TestId.USER);
          expect(originalUser.name).toBe('test');
          const userB = response.users.find((u: any) => u._id === TestId.USER_B);

          expect(userB).toBeDefined();
        },
      });

      // Clean up test data
      await UserModel.updateOne(
        { _id: new Types.ObjectId(TestId.USER) },
        { $unset: { ip_addresses_used: 1 } }
      );

      await UserModel.updateOne(
        { _id: new Types.ObjectId(TestId.USER_B) },
        { $unset: { ip_addresses_used: 1 } }
      );
    });

    test('should return only the user itself when no other users share IPs', async () => {
      // Set up test data - unique IP for user
      const uniqueIP = '10.0.0.50';

      await UserModel.updateOne(
        { _id: new Types.ObjectId(TestId.USER) },
        { $set: { ip_addresses_used: [uniqueIP] } }
      );

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
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

          expect(response.error).toBeUndefined();
          expect(response.users.length).toBeGreaterThanOrEqual(1); // At least the original user
          expect(response.numUsers).toBeGreaterThanOrEqual(1);
          expect(res.status).toBe(200);

          // Verify the original user is included
          const originalUser = response.users.find((u: any) => u._id === TestId.USER);

          expect(originalUser).toBeDefined();
          expect(originalUser._id).toBe(TestId.USER);
          expect(originalUser.name).toBe('test');

          // When there are no other connected users, distinctIPs should contain the user's IPs
          expect(response.distinctIPs.length).toBeGreaterThanOrEqual(1);
          expect(response.numDistinctIPs).toBeGreaterThanOrEqual(1);
        },
      });

      // Clean up test data
      await UserModel.updateOne(
        { _id: new Types.ObjectId(TestId.USER) },
        { $unset: { ip_addresses_used: 1 } }
      );
    });

    test('should handle non-existent user gracefully', async () => {
      const nonExistentUserId = new Types.ObjectId().toString();

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              userId: nonExistentUserId,
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
          expect(response.numUsers).toBe(0);
          expect(response.numDistinctIPs).toBe(0);
          expect(res.status).toBe(200);
        },
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Mock UserModel.aggregate to throw an error
      const originalAggregate = UserModel.aggregate;

      jest.spyOn(UserModel, 'aggregate').mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
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

          expect(response.error).toBe('Internal server error');
          expect(res.status).toBe(500);
        },
      });

      // Restore original implementation
      UserModel.aggregate = originalAggregate;
    });
  });
});
