import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import { NextApiRequestWrapper } from '@root/helpers/apiWrapper';
import { getUserByProviderId } from '@root/helpers/userAuthHelpers';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { AuthProvider } from '@root/models/db/userAuth';
import { UserAuthModel, UserModel } from '@root/models/mongoose';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { logger } from '../../../../../helpers/logger';
import handler from '../../../../../pages/api/auth/google/callback';

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

describe('pages/api/auth/google/callback.ts', () => {
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

  // Mock Google API responses
  const mockGoogleTokenResponse = {
    access_token: 'mock_google_access_token',
    refresh_token: 'mock_google_refresh_token',
    token_type: 'Bearer',
    scope: 'openid profile email',
    expires_in: 3600,
  };

  const mockGoogleUser = {
    id: '123456789012345678901',
    name: 'Test Google User',
    email: 'google@example.com',
    picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    verified_email: true,
  };

  beforeEach(() => {
    fetchMock.resetMocks();
    // Set up environment variables
    process.env.GOOGLE_CLIENT_ID = 'test_google_client_id';
    process.env.GOOGLE_CLIENT_SECRET = 'test_google_client_secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
  });

  describe('OAuth Configuration', () => {
    test('Should return 500 if Google client ID is not configured', async () => {
      delete process.env.GOOGLE_CLIENT_ID;

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

          expect(response.error).toBe('Google OAuth not configured');
          expect(res.status).toBe(500);
        },
      });
    });

    test('Should return 500 if Google client secret is not configured', async () => {
      delete process.env.GOOGLE_CLIENT_SECRET;

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

          expect(response.error).toBe('Google OAuth not configured');
          expect(res.status).toBe(500);
        },
      });
    });
  });

  describe('Token Exchange Errors', () => {
    test('Should redirect to login with error if Google token exchange fails', async () => {
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
          expect(res.headers.get('location')).toBe('http://localhost:3000/login?google_error=true');
        },
      });
    });

    test('Should redirect to login with error if Google user fetch fails', async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(mockGoogleTokenResponse), { status: 200 })
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
          expect(res.headers.get('location')).toBe('http://localhost:3000/login?google_error=true');
        },
      });
    });
  });

  describe('New User Signup Flow', () => {
    test('Should redirect to signup with Google data for new user', async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(mockGoogleTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockGoogleUser), { status: 200 });

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

          expect(location).toContain('/signup?google_temp=');

          // Parse and verify the temporary token contains user data
          const tempParam = location?.split('google_temp=')[1];
          const tempData = JSON.parse(decodeURIComponent(tempParam!));

          expect(tempData.googleId).toBe(mockGoogleUser.id);
          expect(tempData.googleUsername).toBe(mockGoogleUser.name);
          expect(tempData.googleEmail).toBe(mockGoogleUser.email);
        },
      });
    });
  });

  describe('Existing User Login Flow', () => {
    test('Should login existing user and redirect to home', async () => {
      // First create a Google auth record for an existing user
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.GOOGLE,
        providerId: mockGoogleUser.id,
        providerUsername: mockGoogleUser.name,
        providerEmail: mockGoogleUser.email,
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      fetchMock
        .mockResponseOnce(JSON.stringify(mockGoogleTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockGoogleUser), { status: 200 });

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
          expect(res.headers.get('location')).toBe('http://localhost:3000/?google_login=success');
          expect(res.headers.get('set-cookie')).toContain('token=');
        },
      });

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER, provider: AuthProvider.GOOGLE });
    });
  });

  describe('Account Linking Flow (User Logged In)', () => {
    test('Should link Google account to logged in user', async () => {
      const newGoogleUser = {
        ...mockGoogleUser,
        id: '987654321098765432', // Different Google ID
        name: 'New Google User',
        email: 'newgoogle@example.com',
      };

      fetchMock
        .mockResponseOnce(JSON.stringify(mockGoogleTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(newGoogleUser), { status: 200 });

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
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          expect(res.headers.get('location')).toBe('http://localhost:3000/settings?google_connected=true#connections');

          // Verify the Google account was linked
          const googleAuth = await UserAuthModel.findOne({
            userId: TestId.USER_B,
            provider: AuthProvider.GOOGLE,
          });

          expect(googleAuth).toBeTruthy();
          expect(googleAuth!.providerId).toBe(newGoogleUser.id);
          expect(googleAuth!.providerUsername).toBe(newGoogleUser.name);
          expect(googleAuth!.providerEmail).toBe(newGoogleUser.email);
        },
      });

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER_B, provider: AuthProvider.GOOGLE });
    });

    test('Should show already connected message if same user tries to link same Google account', async () => {
      // Create existing Google auth for the user
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER_B,
        provider: AuthProvider.GOOGLE,
        providerId: mockGoogleUser.id,
        providerUsername: mockGoogleUser.name,
        providerEmail: mockGoogleUser.email,
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      fetchMock
        .mockResponseOnce(JSON.stringify(mockGoogleTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockGoogleUser), { status: 200 });

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
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          expect(res.headers.get('location')).toBe('http://localhost:3000/settings?google_already_connected=true#connections');
        },
      });

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER_B, provider: AuthProvider.GOOGLE });
    });

    test('Should show error if Google account is linked to different user', async () => {
      // Create Google auth for a different user
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER_C, // Use USER_C instead of USER to avoid conflicts
        provider: AuthProvider.GOOGLE,
        providerId: mockGoogleUser.id,
        providerUsername: mockGoogleUser.name,
        providerEmail: mockGoogleUser.email,
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      fetchMock
        .mockResponseOnce(JSON.stringify(mockGoogleTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockGoogleUser), { status: 200 });

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
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          expect(res.headers.get('location')).toBe('http://localhost:3000/settings?google_error=already_linked#connections');
        },
      });

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER_C, provider: AuthProvider.GOOGLE });
    });

    test('Should redirect to login if user session is expired', async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(mockGoogleTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockGoogleUser), { status: 200 });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'test_code' },
            cookies: {
              token: 'invalid_expired_token',
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
      const originalOrigin = 'https://sokopath.com';
      const state = Buffer.from(JSON.stringify({ origin: originalOrigin })).toString('base64');

      fetchMock
        .mockResponseOnce(JSON.stringify(mockGoogleTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockGoogleUser), { status: 200 });

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
          expect(location).toContain('/signup?google_temp=');
        },
      });
    });

    test('Should handle invalid state parameter gracefully', async () => {
      const invalidState = 'invalid_base64';

      fetchMock
        .mockResponseOnce(JSON.stringify(mockGoogleTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockGoogleUser), { status: 200 });

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
          expect(res.headers.get('location')).toContain('http://localhost:3000/signup?google_temp=');
        },
      });
    });
  });

  describe('Origin Header Handling', () => {
    test('Should construct origin from headers when origin header is missing', async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(mockGoogleTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockGoogleUser), { status: 200 });

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            query: { code: 'test_code' },
            headers: {
              host: 'sokopath.com',
              'x-forwarded-proto': 'https',
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);
          expect(res.headers.get('location')).toContain('https://sokopath.com/signup?google_temp=');
        },
      });
    });

    test('Should default to http when x-forwarded-proto is not https', async () => {
      fetchMock
        .mockResponseOnce(JSON.stringify(mockGoogleTokenResponse), { status: 200 })
        .mockResponseOnce(JSON.stringify(mockGoogleUser), { status: 200 });

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
          expect(res.headers.get('location')).toContain('http://localhost:3000/signup?google_temp=');
        },
      });
    });
  });
});
