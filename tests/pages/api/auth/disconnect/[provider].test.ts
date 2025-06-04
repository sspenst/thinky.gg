import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { AuthProvider } from '@root/models/db/userAuth';
import { UserAuthModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import * as userAuthHelpers from '../../../../../helpers/userAuthHelpers';
import handler from '../../../../../pages/api/auth/disconnect/[provider]';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

describe('pages/api/auth/disconnect/[provider].ts', () => {
  describe('Provider Disconnection', () => {
    test('Should successfully disconnect Discord provider', async () => {
      // Create a Discord auth record for the user
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.DISCORD,
        providerId: 'discord123',
        providerUsername: 'testuser',
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'DELETE',
            query: { provider: 'discord' },
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
          expect(response.success).toBe(true);

          // Verify the Discord auth was removed
          const remaining = await UserAuthModel.findOne({
            userId: TestId.USER,
            provider: AuthProvider.DISCORD,
          });

          expect(remaining).toBeNull();
        },
      });
    });

    test('Should successfully disconnect Google provider', async () => {
      // Create a Google auth record for the user
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.GOOGLE,
        providerId: 'google456',
        providerUsername: 'testuser@gmail.com',
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'DELETE',
            query: { provider: 'google' },
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
          expect(response.success).toBe(true);

          // Verify the Google auth was removed
          const remaining = await UserAuthModel.findOne({
            userId: TestId.USER,
            provider: AuthProvider.GOOGLE,
          });

          expect(remaining).toBeNull();
        },
      });
    });

    test('Should return 400 for invalid provider', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'DELETE',
            query: { provider: 'invalid' },
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

          expect(res.status).toBe(400);
          expect(response.error).toBe('Invalid authentication provider');
        },
      });
    });

    test('Should return 404 when provider not found for user', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'DELETE',
            query: { provider: 'discord' },
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

          expect(res.status).toBe(404);
          expect(response.error).toBe('Authentication provider not found');
        },
      });
    });

    test('Should return 401 when user is not authenticated', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'DELETE',
            query: { provider: 'discord' },
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
            method: 'DELETE',
            query: { provider: 'discord' },
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
            method: 'GET',
            query: { provider: 'discord' },
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
      // Create a Discord auth record for the user
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.DISCORD,
        providerId: 'discord123',
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      // Mock the UserAuthModel.deleteOne to throw an error instead of using the helper
      const deleteOneSpy = jest.spyOn(UserAuthModel, 'deleteOne').mockRejectedValueOnce(new Error('Database connection failed'));

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'DELETE',
            query: { provider: 'discord' },
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
          expect(response.error).toBe('Failed to disconnect discord account');
        },
      });

      deleteOneSpy.mockRestore();

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER, provider: AuthProvider.DISCORD });
    });
  });
});
