import TestId from '@root/constants/testId';
import { getUserAuthProvider, getUserAuthProvidersForSettings, getUserByProviderId, removeUserAuthProvider, upsertUserAuthProvider } from '@root/helpers/userAuthHelpers';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { AuthProvider } from '@root/models/db/userAuth';
import { UserAuthModel } from '@root/models/mongoose';
import { Types } from 'mongoose';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(async () => {
  // Clean up test data
  await UserAuthModel.deleteMany({ userId: { $in: [TestId.USER_B, TestId.USER_C] } });
});

describe('helpers/userAuthHelpers.ts', () => {
  describe('getUserAuthProvider', () => {
    test('Should return null when provider not found', async () => {
      const provider = await getUserAuthProvider(TestId.USER, AuthProvider.DISCORD);

      expect(provider).toBeNull();
    });

    test('Should return specific provider for user', async () => {
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.DISCORD,
        providerId: 'discord123',
        providerUsername: 'testuser',
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      const provider = await getUserAuthProvider(TestId.USER, AuthProvider.DISCORD);

      expect(provider).toBeTruthy();
      expect(provider?.provider).toBe(AuthProvider.DISCORD);
      expect(provider?.providerId).toBe('discord123');

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER, provider: AuthProvider.DISCORD });
    });
  });

  describe('upsertUserAuthProvider', () => {
    test('Should create new auth provider', async () => {
      const result = await upsertUserAuthProvider(TestId.USER, AuthProvider.DISCORD, {
        providerId: 'discord123',
        providerUsername: 'testuser',
        providerEmail: 'test@example.com',
      });

      expect(result).toBeTruthy();
      expect(result.provider).toBe(AuthProvider.DISCORD);
      expect(result.providerId).toBe('discord123');

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER, provider: AuthProvider.DISCORD });
    });

    test('Should update existing auth provider', async () => {
      // First create an auth provider
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.DISCORD,
        providerId: 'discord123',
        providerUsername: 'oldusername',
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      // Then update it
      const result = await upsertUserAuthProvider(TestId.USER, AuthProvider.DISCORD, {
        providerId: 'discord123',
        providerUsername: 'newusername',
        providerEmail: 'new@example.com',
      });

      expect(result).toBeTruthy();
      expect(result.providerUsername).toBe('newusername');
      expect(result.providerEmail).toBe('new@example.com');

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER, provider: AuthProvider.DISCORD });
    });

    test('Should work with ObjectId userId', async () => {
      const result = await upsertUserAuthProvider(new Types.ObjectId(TestId.USER), AuthProvider.GOOGLE, {
        providerId: 'google456',
        providerUsername: 'testuser@gmail.com',
      });

      expect(result).toBeTruthy();
      expect(result.provider).toBe(AuthProvider.GOOGLE);

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER, provider: AuthProvider.GOOGLE });
    });
  });

  describe('removeUserAuthProvider', () => {
    test('Should successfully remove auth provider', async () => {
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.DISCORD,
        providerId: 'discord123',
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      const result = await removeUserAuthProvider(TestId.USER, AuthProvider.DISCORD);

      expect(result).toBe(true);

      // Verify it's actually deleted
      const provider = await getUserAuthProvider(TestId.USER, AuthProvider.DISCORD);

      expect(provider).toBeNull();
    });

    test('Should return false when provider not found', async () => {
      const result = await removeUserAuthProvider(TestId.USER, AuthProvider.DISCORD);

      expect(result).toBe(false);
    });

    test('Should only remove specific provider', async () => {
      // Create multiple providers
      await Promise.all([
        UserAuthModel.create({
          _id: new Types.ObjectId(),
          userId: TestId.USER,
          provider: AuthProvider.DISCORD,
          providerId: 'discord123',
          connectedAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        }),
        UserAuthModel.create({
          _id: new Types.ObjectId(),
          userId: TestId.USER,
          provider: AuthProvider.GOOGLE,
          providerId: 'google456',
          connectedAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        }),
      ]);

      const result = await removeUserAuthProvider(TestId.USER, AuthProvider.DISCORD);

      expect(result).toBe(true);

      // Discord should be removed
      const discordProvider = await getUserAuthProvider(TestId.USER, AuthProvider.DISCORD);

      expect(discordProvider).toBeNull();

      // Google should still exist
      const googleProvider = await getUserAuthProvider(TestId.USER, AuthProvider.GOOGLE);

      expect(googleProvider).toBeTruthy();

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER, provider: AuthProvider.GOOGLE });
    });
  });

  describe('getUserByProviderId', () => {
    test('Should return null when provider ID not found', async () => {
      const result = await getUserByProviderId(AuthProvider.DISCORD, 'nonexistent');

      expect(result).toBeNull();
    });

    test('Should return auth record for existing provider ID', async () => {
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.DISCORD,
        providerId: 'discord123',
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      const result = await getUserByProviderId(AuthProvider.DISCORD, 'discord123');

      expect(result).toBeTruthy();
      expect(result?.userId.toString()).toBe(TestId.USER);
      expect(result?.providerId).toBe('discord123');

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER, provider: AuthProvider.DISCORD });
    });

    test('Should return correct provider when multiple users have same provider type', async () => {
      await Promise.all([
        UserAuthModel.create({
          _id: new Types.ObjectId(),
          userId: TestId.USER,
          provider: AuthProvider.DISCORD,
          providerId: 'discord123',
          connectedAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        }),
        UserAuthModel.create({
          _id: new Types.ObjectId(),
          userId: TestId.USER_B,
          provider: AuthProvider.DISCORD,
          providerId: 'discord456',
          connectedAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        }),
      ]);

      const result = await getUserByProviderId(AuthProvider.DISCORD, 'discord456');

      expect(result).toBeTruthy();
      expect(result?.userId.toString()).toBe(TestId.USER_B);

      // Clean up
      await UserAuthModel.deleteMany({
        userId: { $in: [TestId.USER, TestId.USER_B] },
        provider: AuthProvider.DISCORD
      });
    });
  });

  describe('getUserAuthProvidersForSettings', () => {
    test('Should return providers with safe data only', async () => {
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.DISCORD,
        providerId: 'discord123',
        providerUsername: 'testuser',
        providerAvatarUrl: 'https://example.com/avatar.png',
        accessToken: 'secret_token', // Should not be included
        refreshToken: 'secret_refresh', // Should not be included
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      const result = await getUserAuthProvidersForSettings(TestId.USER);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        provider: AuthProvider.DISCORD,
        providerId: 'discord123',
        providerUsername: 'testuser',
        providerAvatarUrl: 'https://example.com/avatar.png',
        connectedAt: expect.any(Number),
      });
      expect(result[0]).not.toHaveProperty('accessToken');
      expect(result[0]).not.toHaveProperty('refreshToken');

      // Clean up
      await UserAuthModel.deleteOne({ userId: TestId.USER, provider: AuthProvider.DISCORD });
    });

    test('Should return empty array when user has no providers', async () => {
      const result = await getUserAuthProvidersForSettings(TestId.USER);

      expect(result).toEqual([]);
    });

    test('Should return multiple providers with safe data', async () => {
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

      const result = await getUserAuthProvidersForSettings(TestId.USER);

      expect(result).toHaveLength(2);
      expect(result.map(p => p.provider)).toContain(AuthProvider.DISCORD);
      expect(result.map(p => p.provider)).toContain(AuthProvider.GOOGLE);

      // Clean up
      await UserAuthModel.deleteMany({ userId: TestId.USER });
    });
  });
});
