import { Types } from 'mongoose';
import { getDiscordUserId as getDiscordUserIdFromAuth, getDiscordUserIds as getDiscordUserIdsFromAuth } from './userAuthHelpers';

/**
 * Get Discord user IDs for given user IDs
 * @param userIds Array of user ObjectIds
 * @returns Array of Discord user IDs for users who have connected Discord
 */
export async function getDiscordUserIds(userIds: (Types.ObjectId | string)[]): Promise<string[]> {
  return getDiscordUserIdsFromAuth(userIds);
}

/**
 * Get Discord user ID for a single user
 * @param userId User ObjectId or string
 * @returns Discord user ID if user has connected Discord, null otherwise
 */
export async function getDiscordUserId(userId: Types.ObjectId | string): Promise<string | null> {
  return getDiscordUserIdFromAuth(userId);
}
