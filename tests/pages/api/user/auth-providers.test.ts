import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { AuthProvider } from '@root/models/db/userAuth';
import { UserAuthModel } from '@root/models/mongoose';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { logger } from '../../../../helpers/logger';
import handler from '../../../../pages/api/user/auth-providers';

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

describe('pages/api/user/auth-providers.ts', () => {
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

  describe('GET /api/user/auth-providers', () => {
    test('Should return empty array when user has no connected providers', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(TestId.USER),
            },
            headers: {
              'content-type': 'application/json',
              host: DEFAULT_GAME_ID + '.localhost',
            },
          } as unknown as NextApiRequestWithAuth;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(200);
          expect(response.authProviders).toEqual([]);
        },
      });
    });

    test('Should return connected Discord provider', async () => {
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.DISCORD,
        providerId: 'discord123',
        providerUsername: 'testuser',
        providerAvatarUrl: 'https://example.com/avatar.png',
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(TestId.USER),
            },
            headers: {
              'content-type': 'application/json',
              host: DEFAULT_GAME_ID + '.localhost',
            },
          } as unknown as NextApiRequestWithAuth;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(200);
          expect(response.authProviders).toHaveLength(1);
          expect(response.authProviders[0]).toEqual({
            provider: AuthProvider.DISCORD,
            providerId: 'discord123',
            providerUsername: 'testuser',
            providerAvatarUrl: 'https://example.com/avatar.png',
            connectedAt: expect.any(Number),
          });

          expect(response.authProviders[0]).not.toHaveProperty('accessToken');
          expect(response.authProviders[0]).not.toHaveProperty('refreshToken');
        },
      });

      await UserAuthModel.deleteOne({ userId: TestId.USER, provider: AuthProvider.DISCORD });
    });

    test('Should return connected Google provider', async () => {
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.GOOGLE,
        providerId: 'google456',
        providerUsername: 'testuser@gmail.com',
        providerAvatarUrl: 'https://lh3.googleusercontent.com/avatar',
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(TestId.USER),
            },
            headers: {
              'content-type': 'application/json',
              host: DEFAULT_GAME_ID + '.localhost',
            },
          } as unknown as NextApiRequestWithAuth;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(200);
          expect(response.authProviders).toHaveLength(1);
          expect(response.authProviders[0]).toEqual({
            provider: AuthProvider.GOOGLE,
            providerId: 'google456',
            providerUsername: 'testuser@gmail.com',
            providerAvatarUrl: 'https://lh3.googleusercontent.com/avatar',
            connectedAt: expect.any(Number),
          });
        },
      });

      await UserAuthModel.deleteOne({ userId: TestId.USER, provider: AuthProvider.GOOGLE });
    });

    test('Should return multiple connected providers', async () => {
      await Promise.all([
        UserAuthModel.create({
          _id: new Types.ObjectId(),
          userId: TestId.USER,
          provider: AuthProvider.DISCORD,
          providerId: 'discord123',
          providerUsername: 'testuser',
          connectedAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        }),
        UserAuthModel.create({
          _id: new Types.ObjectId(),
          userId: TestId.USER,
          provider: AuthProvider.GOOGLE,
          providerId: 'google456',
          providerUsername: 'testuser@gmail.com',
          connectedAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        }),
      ]);

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(TestId.USER),
            },
            headers: {
              'content-type': 'application/json',
              host: DEFAULT_GAME_ID + '.localhost',
            },
          } as unknown as NextApiRequestWithAuth;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(200);
          expect(response.authProviders).toHaveLength(2);

          const providers = response.authProviders.map((p: any) => p.provider);

          expect(providers).toContain(AuthProvider.DISCORD);
          expect(providers).toContain(AuthProvider.GOOGLE);
        },
      });

      await UserAuthModel.deleteMany({ userId: TestId.USER });
    });

    test('Should not include sensitive data like access tokens', async () => {
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.DISCORD,
        providerId: 'discord123',
        providerUsername: 'testuser',
        accessToken: 'secret_access_token',
        refreshToken: 'secret_refresh_token',
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(TestId.USER),
            },
            headers: {
              'content-type': 'application/json',
              host: DEFAULT_GAME_ID + '.localhost',
            },
          } as unknown as NextApiRequestWithAuth;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(200);
          expect(response.authProviders).toHaveLength(1);

          const provider = response.authProviders[0];

          expect(provider).not.toHaveProperty('accessToken');
          expect(provider).not.toHaveProperty('refreshToken');
          expect(provider).not.toHaveProperty('userId');
          expect(provider).not.toHaveProperty('updatedAt');
        },
      });

      await UserAuthModel.deleteOne({ userId: TestId.USER, provider: AuthProvider.DISCORD });
    });

    test('Should return 401 when user is not authenticated', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(401);
          expect(response.error).toContain('Unauthorized');
        },
      });
    });

    test('Should return 401 when token is invalid', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            cookies: {
              token: 'invalid_token',
            },
            headers: {
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWithAuth;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(401);
          expect(response.error).toContain('Unauthorized');
        },
      });
    });

    test('Should handle method not allowed', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'POST',
            cookies: {
              token: getTokenCookieValue(TestId.USER),
            },
            headers: {
              'content-type': 'application/json',
              host: DEFAULT_GAME_ID + '.localhost',
            },
          } as unknown as NextApiRequestWithAuth;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(405);
          expect(response.error).toBe('Method not allowed');
        },
      });
    });

    test('Should handle database errors gracefully', async () => {
      const findSpy = jest.spyOn(UserAuthModel, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            cookies: {
              token: getTokenCookieValue(TestId.USER),
            },
            headers: {
              'content-type': 'application/json',
              host: DEFAULT_GAME_ID + '.localhost',
            },
          } as unknown as NextApiRequestWithAuth;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(res.status).toBe(500);
          expect(response.error).toBe('Failed to fetch authentication providers');
        },
      });

      findSpy.mockRestore();
    });
  });
});
