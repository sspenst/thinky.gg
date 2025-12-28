import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { testApiHandler } from 'next-test-api-route-handler';
import TestId from '../../../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../../lib/withAuth';
import { AuthProvider } from '../../../../../models/db/userAuth';
import { UserAuthModel, UserModel } from '../../../../../models/mongoose';
import handler from '../../../../../pages/api/user/discord/sync-roles';

beforeAll(async () => {
  await dbConnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await dbDisconnect();
});

enableFetchMocks();

describe('pages/api/user/discord/sync-roles', () => {
  test('Should return 401 when not authenticated', async () => {
    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req = {
          method: 'POST',
          cookies: {},
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'POST' });
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json.error).toBe('Unauthorized: No token provided');
      },
    });
  });

  test('Should return error when Discord is not connected', async () => {
    const token = getTokenCookieValue(TestId.USER);

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req = {
          method: 'POST',
          cookies: {
            token: token,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'POST' });
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.message).toBe('Discord account not connected');
      },
    });
  });

  test('Should sync Discord role when Discord is connected and user has Pro', async () => {
    const user = await UserModel.findById(TestId.USER_PRO);
    const token = getTokenCookieValue(TestId.USER_PRO);

    // Create a Discord auth for the user
    await UserAuthModel.create({
      _id: new Types.ObjectId(),
      userId: user._id,
      provider: AuthProvider.DISCORD,
      providerId: '123456789',
      providerUsername: 'testuser',
      connectedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Mock the Discord API
    fetchMock.mockResponseOnce('', { status: 204 });

    // Mock environment variables
    process.env.DISCORD_ROLES_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_GUILD_ID = 'test-guild-id';
    process.env.DISCORD_PRO_ROLE_ID = 'test-pro-role-id';

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req = {
          method: 'POST',
          cookies: {
            token: token,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'POST' });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.message).toBe('Discord roles synced successfully!');

        // Verify Discord API was called correctly with PUT to add the role
        expect(fetchMock).toHaveBeenCalledWith(
          'https://discord.com/api/guilds/test-guild-id/members/123456789/roles/test-pro-role-id',
          expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({
              Authorization: 'Bot test-bot-token',
            }),
          })
        );
      },
    });

    // Cleanup
    await UserAuthModel.deleteOne({
      userId: user._id,
      provider: AuthProvider.DISCORD,
    });

    delete process.env.DISCORD_ROLES_BOT_TOKEN;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_PRO_ROLE_ID;
  });

  test('Should succeed even when user is not in Discord server', async () => {
    const user = await UserModel.findById(TestId.USER_PRO);
    const token = getTokenCookieValue(TestId.USER_PRO);

    // Create a Discord auth for the user
    await UserAuthModel.create({
      _id: new Types.ObjectId(),
      userId: user._id,
      provider: AuthProvider.DISCORD,
      providerId: '123456789',
      providerUsername: 'testuser',
      connectedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Mock the Discord API to return 404 (not in server)
    fetchMock.mockResponseOnce(JSON.stringify({ message: 'Unknown Member' }), { status: 404 });

    // Mock environment variables
    process.env.DISCORD_ROLES_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_GUILD_ID = 'test-guild-id';
    process.env.DISCORD_PRO_ROLE_ID = 'test-pro-role-id';

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req = {
          method: 'POST',
          cookies: {
            token: token,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'POST' });
        const json = await res.json();

        // Should still return success since we simplified the error handling
        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.message).toBe('Discord roles synced successfully!');
      },
    });

    // Cleanup
    await UserAuthModel.deleteOne({
      userId: user._id,
      provider: AuthProvider.DISCORD,
    });

    delete process.env.DISCORD_ROLES_BOT_TOKEN;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_PRO_ROLE_ID;
  });

  test('Should succeed silently when Discord bot is not configured', async () => {
    const user = await UserModel.findById(TestId.USER_PRO);
    const token = getTokenCookieValue(TestId.USER_PRO);

    // Create a Discord auth for the user
    await UserAuthModel.create({
      _id: new Types.ObjectId(),
      userId: user._id,
      provider: AuthProvider.DISCORD,
      providerId: '123456789',
      providerUsername: 'testuser',
      connectedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Ensure env variables are not set
    delete process.env.DISCORD_ROLES_BOT_TOKEN;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_PRO_ROLE_ID;

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req = {
          method: 'POST',
          cookies: {
            token: token,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'POST' });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.message).toBe('Discord roles synced successfully!');
      },
    });

    // Cleanup
    await UserAuthModel.deleteOne({
      userId: user._id,
      provider: AuthProvider.DISCORD,
    });
  });

  test('Should remove Discord role when user does not have Pro', async () => {
    const user = await UserModel.findById(TestId.USER);
    const token = getTokenCookieValue(TestId.USER);

    // Create a Discord auth for the user
    await UserAuthModel.create({
      _id: new Types.ObjectId(),
      userId: user._id,
      provider: AuthProvider.DISCORD,
      providerId: '987654321',
      providerUsername: 'nonprouser',
      connectedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Mock the Discord API
    fetchMock.mockResponseOnce('', { status: 204 });

    // Mock environment variables
    process.env.DISCORD_ROLES_BOT_TOKEN = 'test-bot-token';
    process.env.DISCORD_GUILD_ID = 'test-guild-id';
    process.env.DISCORD_PRO_ROLE_ID = 'test-pro-role-id';

    await testApiHandler({
      pagesHandler: async (_, res) => {
        const req = {
          method: 'POST',
          cookies: {
            token: token,
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'POST' });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.message).toBe('Discord roles synced successfully!');

        // Verify Discord API was called with DELETE to remove the role
        expect(fetchMock).toHaveBeenCalledWith(
          'https://discord.com/api/guilds/test-guild-id/members/987654321/roles/test-pro-role-id',
          expect.objectContaining({
            method: 'DELETE',
            headers: expect.objectContaining({
              Authorization: 'Bot test-bot-token',
            }),
          })
        );
      },
    });

    // Cleanup
    await UserAuthModel.deleteOne({
      userId: user._id,
      provider: AuthProvider.DISCORD,
    });

    delete process.env.DISCORD_ROLES_BOT_TOKEN;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_PRO_ROLE_ID;
  });
});
