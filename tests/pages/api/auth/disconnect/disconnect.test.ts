import { AuthProvider } from '@root/models/db/userAuth';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { DEFAULT_GAME_ID } from '../../../../../constants/GameId';
import TestId from '../../../../../constants/testId';
import dbConnect from '../../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../../lib/withAuth';
import { UserAuthModel } from '../../../../../models/mongoose';
import handler from '../../../../../pages/api/auth/disconnect/[provider]';

beforeAll(async () => {
  await dbConnect();
});

afterEach(async () => {
  await UserAuthModel.deleteMany({ userId: TestId.USER });
});

describe('pages/api/auth/disconnect/[provider].ts', () => {
  describe('DELETE /api/auth/disconnect/[provider]', () => {
    test('Should successfully disconnect provider when user has multiple providers', async () => {
      // Create multiple OAuth providers for the user
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
            method: 'DELETE',
            query: {
              provider: 'discord',
            },
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

          // Verify the provider was actually removed
          const remainingProviders = await UserAuthModel.find({ userId: TestId.USER });

          expect(remainingProviders).toHaveLength(1);
          expect(remainingProviders[0].provider).toBe(AuthProvider.GOOGLE);
        },
      });
    });

    test('Should prevent disconnecting last OAuth provider', async () => {
      // Create only one OAuth provider for the user
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
            query: {
              provider: 'discord',
            },
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
          expect(response.error).toBe('Cannot disconnect your last authentication method. Please set up password authentication first by requesting a password reset email in the Security section.');
          expect(response.requiresPassword).toBe(true);

          // Verify the provider was NOT removed
          const remainingProviders = await UserAuthModel.find({ userId: TestId.USER });

          expect(remainingProviders).toHaveLength(1);
        },
      });
    });

    test('Should return 404 for non-existent provider', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'DELETE',
            query: {
              provider: 'discord',
            },
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

    test('Should return 400 for invalid provider', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'DELETE',
            query: {
              provider: 'invalid',
            },
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

    test('Should require authentication', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'DELETE',
            query: {
              provider: 'discord',
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

          expect(res.status).toBe(401);
        },
      });
    });
  });
});
