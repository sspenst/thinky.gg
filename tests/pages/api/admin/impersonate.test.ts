import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import Role from '@root/constants/role';
import TestId from '@root/constants/testId';
import { logger } from '@root/helpers/logger';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { UserModel } from '@root/models/mongoose';
import impersonateHandler from '@root/pages/api/admin/impersonate';
import { enableFetchMocks } from 'jest-fetch-mock';
import jwt from 'jsonwebtoken';
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

describe('api/admin/impersonate', () => {
  // Mock logger to avoid console spam during tests
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

  describe('POST - Start Impersonation', () => {
    test('should successfully impersonate another user as admin', async () => {
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

          await impersonateHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.success).toBe(true);
          expect(response.targetUser).toBeDefined();
          expect(response.targetUser._id).toBe(TestId.USER);
          expect(res.status).toBe(200);

          // Check that the cookie was set with impersonation data
          const setCookieHeader = res.headers.get('set-cookie');
          expect(setCookieHeader).toBeDefined();
          
          // Extract token from cookie
          const tokenMatch = setCookieHeader?.match(/token=([^;]+)/);
          expect(tokenMatch).toBeDefined();
          
          if (tokenMatch) {
            const token = tokenMatch[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
            
            expect(decoded.userId).toBe(TestId.USER);
            expect(decoded.adminId).toBe(TestId.USER_ADMIN);
            expect(decoded.isImpersonating).toBe(true);
            expect(decoded.exp - decoded.iat).toBe(3600); // 1 hour = 3600 seconds
          }
        },
      });
    });

    test('should return 403 for non-admin user', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER) // Regular user, not admin
            },
            body: {
              userId: TestId.USER_B,
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await impersonateHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Forbidden: Admin access required');
          expect(res.status).toBe(403);
        },
      });
    });

    test('should return 400 for missing userId', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {},
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await impersonateHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Invalid body.userId');
          expect(res.status).toBe(400);
        },
      });
    });

    test('should return 404 for non-existent user', async () => {
      const nonExistentUserId = new Types.ObjectId();

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            body: {
              userId: nonExistentUserId.toString(),
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await impersonateHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('User not found');
          expect(res.status).toBe(404);
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

          await impersonateHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Unauthorized: No token provided');
          expect(res.status).toBe(401);
        },
      });
    });
  });

  describe('DELETE - Stop Impersonation', () => {
    test('should successfully stop impersonation and restore admin session', async () => {
      // Create impersonation token
      const impersonationToken = jwt.sign({
        userId: TestId.USER,
        adminId: TestId.USER_ADMIN,
        isImpersonating: true,
      }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'DELETE',
            cookies: {
              token: impersonationToken
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await impersonateHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.success).toBe(true);
          expect(res.status).toBe(200);

          // Check that the cookie was set with admin data
          const setCookieHeader = res.headers.get('set-cookie');
          expect(setCookieHeader).toBeDefined();
          
          // Extract token from cookie
          const tokenMatch = setCookieHeader?.match(/token=([^;]+)/);
          expect(tokenMatch).toBeDefined();
          
          if (tokenMatch) {
            const token = tokenMatch[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
            
            expect(decoded.userId).toBe(TestId.USER_ADMIN);
            expect(decoded.adminId).toBeUndefined();
            expect(decoded.isImpersonating).toBeUndefined();
          }
        },
      });
    });

    test('should return 400 when not impersonating', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'DELETE',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN) // Regular admin token, not impersonating
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await impersonateHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Not currently impersonating');
          expect(res.status).toBe(400);
        },
      });
    });

    test('should return 400 for missing token', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'DELETE',
            cookies: {},
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await impersonateHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Unauthorized: No token provided');
          expect(res.status).toBe(401);
        },
      });
    });

  });

  describe('Invalid Methods', () => {
    test('should return 405 for GET method', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await impersonateHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Method not allowed');
          expect(res.status).toBe(405);
        },
      });
    });

    test('should return 405 for PUT method', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req: NextApiRequestWithAuth = {
            method: 'PUT',
            cookies: {
              token: getTokenCookieValue(TestId.USER_ADMIN)
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await impersonateHandler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Method not allowed');
          expect(res.status).toBe(405);
        },
      });
    });
  });
});