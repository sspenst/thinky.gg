import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import { NextApiRequestWrapper } from '@root/helpers/apiWrapper';
import { getUserByProviderId } from '@root/helpers/userAuthHelpers';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { AuthProvider } from '@root/models/db/userAuth';
import { UserAuthModel } from '@root/models/mongoose';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { logger } from '../../../../../helpers/logger';
import handler from '../../../../../pages/api/auth/discord/callback';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterEach(async () => {
  // Clean up any test data between tests
  await UserAuthModel.deleteMany({
    userId: { $in: [TestId.USER, TestId.USER_B, TestId.USER_C] },
    provider: { $in: [AuthProvider.GOOGLE, AuthProvider.DISCORD] }
  });
});

enableFetchMocks();

describe('pages/api/auth/discord/callback.ts', () => {
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

  // Mock Discord API responses
  const mockDiscordTokenResponse = {
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    token_type: 'Bearer',
    scope: 'identify email',
  };

  const mockDiscordUser = {
    id: '123456789012345678',
    username: 'testdiscorduser',
    email: 'discord@example.com',
    avatar: 'a_123456789abcdef',
    discriminator: '0001',
  };

  beforeEach(() => {
    fetchMock.resetMocks();
    // Set up environment variables
    process.env.DISCORD_CLIENT_ID = 'test_client_id';
    process.env.DISCORD_CLIENT_SECRET = 'test_client_secret';
    process.env.DISCORD_REDIRECT_URI = 'http://localhost:3000/api/auth/discord/callback';
  });

  describe('OAuth Configuration', () => {
    test('Should return 500 if Discord client ID is not configured', async () => {
      delete process.env.DISCORD_CLIENT_ID;

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'test_code' },
            headers: {
              origin: 'http://localhost:3000',
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Discord OAuth not configured');
          expect(res.status).toBe(500);
        },
      });
    });

    test('Should return 500 if Discord client secret is not configured', async () => {
      delete process.env.DISCORD_CLIENT_SECRET;

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'test_code' },
            headers: {
              origin: 'http://localhost:3000',
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();
          const response = await res.json();

          expect(response.error).toBe('Discord OAuth not configured');
          expect(res.status).toBe(500);
        },
      });
    });
  });

  describe('Token Exchange Errors', () => {
    test('Should redirect to login with error if Discord token exchange fails', async () => {
      fetchMock.mockResponseOnce('', { status: 400 });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'invalid_code' },
            headers: {
              origin: 'http://localhost:3000',
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          expect(res.headers.get('location')).toBe('http://localhost:3000/login?discord_error=true');
        },
      });
    });

    test('Should redirect to login with error if Discord user fetch fails', async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(mockDiscordTokenResponse), { status: 200 })
        .mockResponseOnce('', { status: 400 });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'test_code' },
            headers: {
              origin: 'http://localhost:3000',
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          expect(res.headers.get('location')).toBe('http://localhost:3000/login?discord_error=true');
        },
      });
    });
  });

  describe('New User Signup Flow', () => {
    test('Should redirect to signup with Discord data for new user', async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(mockDiscordTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockDiscordUser), { status: 200 });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'test_code' },
            headers: {
              origin: 'http://localhost:3000',
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          const location = res.headers.get('location');

          expect(location).toContain('/signup?discord_temp=');

          // Decode and verify the passed Discord data
          const url = new URL(location!);
          const discordTemp = url.searchParams.get('discord_temp');
          const discordData = JSON.parse(decodeURIComponent(discordTemp!));

          expect(discordData.discordId).toBe(mockDiscordUser.id);
          expect(discordData.discordUsername).toBe(mockDiscordUser.username);
          expect(discordData.discordEmail).toBe(mockDiscordUser.email);
          expect(discordData.access_token).toBe(mockDiscordTokenResponse.access_token);
        },
      });
    });
  });

  describe('Existing User Login Flow', () => {
    test('Should login existing user and redirect to home', async () => {
      // First create a Discord auth record for an existing user
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.DISCORD,
        providerId: mockDiscordUser.id,
        providerUsername: mockDiscordUser.username,
        providerEmail: mockDiscordUser.email,
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      fetchMock
        .mockResponseOnce(JSON.stringify(mockDiscordTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockDiscordUser), { status: 200 });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'test_code' },
            headers: {
              origin: 'http://localhost:3000',
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          expect(res.headers.get('location')).toBe('http://localhost:3000/?discord_login=success');
          expect(res.headers.get('set-cookie')).toContain('token=');
        },
      });

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER, provider: AuthProvider.DISCORD });
    });

    test('Should show error if Discord account is linked to different user', async () => {
      // Create Discord auth for a different user
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER_C,
        provider: AuthProvider.DISCORD,
        providerId: mockDiscordUser.id,
        providerUsername: mockDiscordUser.username,
        providerEmail: mockDiscordUser.email,
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      fetchMock
        .mockResponseOnce(JSON.stringify(mockDiscordTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockDiscordUser), { status: 200 });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'test_code' },
            cookies: {
              token: getTokenCookieValue(TestId.USER_B),
            },
            headers: {
              origin: 'http://localhost:3000',
              'content-type': 'application/json',
              host: DEFAULT_GAME_ID + '.localhost',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          expect(res.headers.get('location')).toBe('http://localhost:3000/settings?discord_error=already_linked#connections');
        },
      });

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER_C, provider: AuthProvider.DISCORD });
    });

    test('Should redirect to login if user session is expired', async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(mockDiscordTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockDiscordUser), { status: 200 });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'test_code' },
            cookies: {
              token: 'invalid_token',
            },
            headers: {
              origin: 'http://localhost:3000',
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=session_expired');
        },
      });
    });
  });

  describe('State Parameter Handling', () => {
    test('Should use origin from state parameter when provided', async () => {
      const originalOrigin = 'https://pathology.com';
      const state = Buffer.from(JSON.stringify({ origin: originalOrigin })).toString('base64');

      fetchMock
        .mockResponseOnce(JSON.stringify(mockDiscordTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockDiscordUser), { status: 200 });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'test_code', state },
            headers: {
              origin: 'http://localhost:3000',
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          const location = res.headers.get('location');

          expect(location).toContain(originalOrigin);
          expect(location).toContain('/signup?discord_temp=');
        },
      });
    });

    test('Should handle invalid state parameter gracefully', async () => {
      const invalidState = 'invalid_base64';

      fetchMock
        .mockResponseOnce(JSON.stringify(mockDiscordTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockDiscordUser), { status: 200 });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'test_code', state: invalidState },
            headers: {
              origin: 'http://localhost:3000',
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          // Should still work with fallback origin
          expect(res.headers.get('location')).toContain('http://localhost:3000/signup?discord_temp=');
        },
      });
    });
  });

  describe('Origin Header Handling', () => {
    test('Should construct origin from headers when origin header is missing', async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(mockDiscordTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockDiscordUser), { status: 200 });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'test_code' },
            headers: {
              host: 'pathology.com',
              'x-forwarded-proto': 'https',
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          expect(res.headers.get('location')).toContain('https://pathology.com/signup?discord_temp=');
        },
      });
    });

    test('Should default to http when x-forwarded-proto is not https', async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(mockDiscordTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockDiscordUser), { status: 200 });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'test_code' },
            headers: {
              host: 'localhost:3000',
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          expect(res.headers.get('location')).toContain('http://localhost:3000/signup?discord_temp=');
        },
      });
    });
  });

  describe('Account Linking Flow (User Logged In)', () => {
    test('Should link Discord account to logged in user', async () => {
      const newDiscordUser = {
        ...mockDiscordUser,
        id: '987654321098765432', // Different Discord ID
        username: 'newdiscorduser',
        email: 'newdiscord@example.com',
      };

      fetchMock
        .mockResponseOnce(JSON.stringify(mockDiscordTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(newDiscordUser), { status: 200 });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'test_code' },
            cookies: {
              token: getTokenCookieValue(TestId.USER_B),
            },
            headers: {
              origin: 'http://localhost:3000',
              'content-type': 'application/json',
              host: DEFAULT_GAME_ID + '.localhost',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          expect(res.headers.get('location')).toBe('http://localhost:3000/settings?discord_connected=true#connections');

          // Verify the Discord account was linked
          const authRecord = await getUserByProviderId(AuthProvider.DISCORD, newDiscordUser.id);

          expect(authRecord).toBeTruthy();
          expect(authRecord?.userId.toString()).toBe(TestId.USER_B);
        },
      });

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER_B, provider: AuthProvider.DISCORD });
    });
  });
});
