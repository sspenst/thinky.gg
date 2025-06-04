import { Types } from 'mongoose';
import dbConnect from '../lib/dbConnect';
import UserAuth, { AuthProvider } from '../models/db/userAuth';
import { UserAuthModel } from '../models/mongoose';

/**
 * Get all authentication providers for a user
 * @param userId User ObjectId
 * @returns Array of UserAuth records
 */
export async function getUserAuthProviders(userId: Types.ObjectId | string): Promise<UserAuth[]> {
  await dbConnect();

  return UserAuthModel.find({
    userId: userId
  }).lean<UserAuth[]>();
}

/**
 * Get a specific authentication provider for a user
 * @param userId User ObjectId
 * @param provider AuthProvider enum
 * @returns UserAuth record or null
 */
export async function getUserAuthProvider(
  userId: Types.ObjectId | string,
  provider: AuthProvider
): Promise<UserAuth | null> {
  await dbConnect();

  return UserAuthModel.findOne({
    userId: userId,
    provider: provider
  }).lean<UserAuth>();
}

/**
 * Create or update a user's authentication provider
 * @param userId User ObjectId
 * @param provider AuthProvider enum
 * @param data Provider data
 * @returns Created/updated UserAuth record
 */
export async function upsertUserAuthProvider(
  userId: Types.ObjectId | string,
  provider: AuthProvider,
  data: {
    providerId: string;
    providerUsername?: string;
    providerEmail?: string;
    providerAvatarUrl?: string;
    accessToken?: string;
    refreshToken?: string;
  }
): Promise<UserAuth> {
  await dbConnect();

  const now = Math.floor(Date.now() / 1000);

  const result = await UserAuthModel.findOneAndUpdate(
    {
      userId: userId,
      provider: provider
    },
    {
      $set: {
        providerId: data.providerId,
        providerUsername: data.providerUsername,
        providerEmail: data.providerEmail,
        providerAvatarUrl: data.providerAvatarUrl,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: new Types.ObjectId(),
        userId: userId,
        provider: provider,
        connectedAt: now,
      }
    },
    {
      upsert: true,
      new: true,
      runValidators: true
    }
  ).lean<UserAuth>();

  if (!result) {
    throw new Error('Failed to create or update user auth provider');
  }

  return result;
}

/**
 * Remove a user's authentication provider
 * @param userId User ObjectId
 * @param provider AuthProvider enum
 * @returns Success boolean
 */
export async function removeUserAuthProvider(
  userId: Types.ObjectId | string,
  provider: AuthProvider
): Promise<boolean> {
  await dbConnect();

  const result = await UserAuthModel.deleteOne({
    userId: userId,
    provider: provider
  });

  return result.deletedCount > 0;
}

/**
 * Get Discord user IDs for given user IDs
 * @param userIds Array of user ObjectIds
 * @returns Array of Discord user IDs for users who have connected Discord
 */
export async function getDiscordUserIds(userIds: (Types.ObjectId | string)[]): Promise<string[]> {
  await dbConnect();

  const auths = await UserAuthModel.find(
    {
      userId: { $in: userIds },
      provider: AuthProvider.DISCORD
    },
    { providerId: 1 }
  ).lean<Pick<UserAuth, 'providerId'>[]>();

  return auths.map(auth => auth.providerId);
}

/**
 * Get Discord user ID for a single user
 * @param userId User ObjectId or string
 * @returns Discord user ID if user has connected Discord, null otherwise
 */
export async function getDiscordUserId(userId: Types.ObjectId | string): Promise<string | null> {
  const discordIds = await getDiscordUserIds([userId]);

  return discordIds.length > 0 ? discordIds[0] : null;
}

/**
 * Get users by provider ID (useful for OAuth callbacks)
 * @param provider AuthProvider enum
 * @param providerId Provider's user ID
 * @returns UserAuth record or null
 */
export async function getUserByProviderId(
  provider: AuthProvider,
  providerId: string
): Promise<UserAuth | null> {
  await dbConnect();

  return UserAuthModel.findOne({
    provider: provider,
    providerId: providerId
  }).lean<UserAuth>();
}

/**
 * Get user auth data with provider info for settings display
 * @param userId User ObjectId
 * @returns Array of auth providers with safe data for frontend
 */
export async function getUserAuthProvidersForSettings(userId: Types.ObjectId | string) {
  await dbConnect();

  const auths = await UserAuthModel.find(
    { userId: userId },
    {
      provider: 1,
      providerId: 1,
      providerUsername: 1,
      providerAvatarUrl: 1,
      connectedAt: 1
    }
  ).lean<Pick<UserAuth, 'provider' | 'providerId' | 'providerUsername' | 'providerAvatarUrl' | 'connectedAt'>[]>();

  return auths.map(auth => ({
    provider: auth.provider,
    providerId: auth.providerId,
    providerUsername: auth.providerUsername,
    providerAvatarUrl: auth.providerAvatarUrl,
    connectedAt: auth.connectedAt
  }));
}
