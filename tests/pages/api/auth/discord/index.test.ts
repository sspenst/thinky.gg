import { NextApiRequestWrapper } from '@root/helpers/apiWrapper';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import { logger } from '../../../../../helpers/logger';
import handler from '../../../../../pages/api/auth/discord/index';

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

describe('pages/api/auth/discord/index.ts', () => {
  jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

  beforeEach(() => {
    // Set up environment variables
    process.env.DISCORD_CLIENT_ID = 'test_discord_client_id';
    process.env.DISCORD_REDIRECT_URI = 'http://localhost:3000/api/auth/discord/callback';
  });

  describe('OAuth Initiation', () => {
    test('Should redirect to Discord authorization URL with correct parameters', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
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
          const url = new URL(location!);

          expect(url.origin).toBe('https://discord.com');
          expect(url.pathname).toBe('/api/oauth2/authorize');
          expect(url.searchParams.get('client_id')).toBe(process.env.DISCORD_CLIENT_ID);
          expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/discord/callback');
          expect(url.searchParams.get('response_type')).toBe('code');
          expect(url.searchParams.get('scope')).toBe('identify email');
          expect(url.searchParams.get('state')).toBeTruthy();
        },
      });
    });

    test('Should include origin in state parameter', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            headers: {
              origin: 'https://custom-domain.com',
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);

          const location = res.headers.get('location');
          const url = new URL(location!);
          const state = url.searchParams.get('state');
          const decodedState = JSON.parse(Buffer.from(state!, 'base64').toString());

          expect(decodedState.origin).toBe('https://custom-domain.com');
        },
      });
    });

    test('Should return 500 if Discord client ID is not configured', async () => {
      const originalClientId = process.env.DISCORD_CLIENT_ID;

      delete process.env.DISCORD_CLIENT_ID;

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
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

          expect(res.status).toBe(500);
          expect(response.error).toBe('Discord client ID not configured');
        },
      });

      // Restore
      process.env.DISCORD_CLIENT_ID = originalClientId;
    });

    test('Should use environment DISCORD_REDIRECT_URI when available', async () => {
      const originalRedirectUri = process.env.DISCORD_REDIRECT_URI;

      process.env.DISCORD_REDIRECT_URI = 'https://custom.com/auth/discord/callback';

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
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
          const url = new URL(location!);

          expect(url.searchParams.get('redirect_uri')).toBe('https://custom.com/auth/discord/callback');
        },
      });

      // Restore
      if (originalRedirectUri) {
        process.env.DISCORD_REDIRECT_URI = originalRedirectUri;
      } else {
        delete process.env.DISCORD_REDIRECT_URI;
      }
    });

    test('Should construct redirect URI from request origin when DISCORD_REDIRECT_URI is not set', async () => {
      const originalRedirectUri = process.env.DISCORD_REDIRECT_URI;

      delete process.env.DISCORD_REDIRECT_URI;

      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'GET',
            headers: {
              origin: 'https://sokopath.com',
              'content-type': 'application/json',
            },
          } as unknown as NextApiRequestWrapper;

          await handler(req, res);
        },
        test: async ({ fetch }) => {
          const res = await fetch();

          expect(res.status).toBe(307);

          const location = res.headers.get('location');
          const url = new URL(location!);

          expect(url.searchParams.get('redirect_uri')).toBe('https://sokopath.com/api/auth/discord/callback');
        },
      });

      // Restore
      if (originalRedirectUri) {
        process.env.DISCORD_REDIRECT_URI = originalRedirectUri;
      }
    });

    test('Should handle non-GET methods with 405', async () => {
      await testApiHandler({
        pagesHandler: async (_, res) => {
          const req = {
            method: 'POST',
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

          expect(response.error).toBe('Method not allowed');
          expect(res.status).toBe(405);
        },
      });
    });
  });
});
