import User from '../models/db/user';
import UserAuth, { AuthProvider } from '../models/db/userAuth';
import { UserAuthModel } from '../models/mongoose';
import isPro from './isPro';
import { logger } from './logger';

/**
 * Sync Discord Pro role for a user
 * Adds the role if user has Pro and Discord connected, removes it if they don't
 * @param user - User object
 */
export default async function syncDiscordProRole(user: User) {
  // Find the user's Discord auth
  const discordAuth = await UserAuthModel.findOne<UserAuth>({
    userId: user._id,
    provider: AuthProvider.DISCORD,
  });

  if (!discordAuth) {
    // User doesn't have Discord connected - nothing to do
    return;
  }

  return await updateDiscordProRole(discordAuth.providerId, isPro(user));
}

/**
 * Set or unset Discord Pro role for a user
 * @param discordProviderId - Discord provider ID (not MongoDB ID)
 * @param shouldHaveRole - If we want to set or unset the Pro role
 * @returns Object with success status
 */
export async function updateDiscordProRole(
  discordProviderId: string,
  shouldHaveRole: boolean,
) {
  const botToken = process.env.DISCORD_ROLES_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const proRoleId = process.env.DISCORD_PRO_ROLE_ID;

  // If Discord integration is not configured, silently succeed
  if (!botToken || !guildId || !proRoleId) {
    return { success: true };
  }

  try {
    const roleUrl = `https://discord.com/api/guilds/${guildId}/members/${discordProviderId}/roles/${proRoleId}`;

    const response = await fetch(roleUrl, {
      method: shouldHaveRole ? 'PUT' : 'DELETE',
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    // 404 is fine - user might not be in server or might not have the role
    if (response.status === 404) {
      logger.info(`User ${discordProviderId} not in Discord server or doesn't have Pro role`);

      return;
    }

    if (!response.ok) {
      const errorText = await response.text();

      logger.error(`Failed to remove Discord Pro role: ${response.status} ${errorText}`);

      return;
    }

    logger.info(`Removed Discord Pro role for Discord user ${discordProviderId}`);

    return;
  } catch (error) {
    logger.error('Error removing Discord Pro role:', error);

    return;
  }
}
