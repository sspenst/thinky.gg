import { Types } from 'mongoose';
import User from '../models/db/user';
import { AuthProvider } from '../models/db/userAuth';
import { UserAuthModel, UserModel } from '../models/mongoose';
import { logger } from './logger';

/**
 * Get Discord user ID mappings for given user IDs
 * @param userIds Array of user ObjectIds
 * @returns Array of mappings with userId and discordId
 */
async function getDiscordUserIdMappings(userIds: (Types.ObjectId | string)[]): Promise<{ userId: Types.ObjectId; discordId: string }[]> {
  const auths = await UserAuthModel.find(
    {
      userId: { $in: userIds },
      provider: AuthProvider.DISCORD
    },
    { userId: 1, providerId: 1 }
  ).lean();

  return auths.map(auth => ({
    userId: auth.userId,
    discordId: auth.providerId
  }));
}

/**
 * Check whether a Discord user is a member of the Thinky guild.
 * A linked account that has since left the server renders as "@unknown-user"
 * when mentioned, so we only emit a mention for users we can confirm are members.
 * @param discordProviderId Discord user ID (snowflake)
 * @returns true if the user is a guild member, false if not. When the bot is not
 * configured we cannot check, so we assume membership to preserve mention behavior.
 */
async function isDiscordGuildMember(discordProviderId: string): Promise<boolean> {
  const botToken = process.env.DISCORD_ROLES_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  // Discord integration not configured - can't verify, assume member
  if (!botToken || !guildId) {
    return true;
  }

  try {
    const response = await fetch(
      `https://discord.com/api/guilds/${guildId}/members/${discordProviderId}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    // 404 means the user is not in the server -> mention would show "@unknown-user"
    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      // On unexpected errors (rate limits, outages) assume member so we don't
      // strip valid mentions because of a transient failure
      logger.error(`Failed to check Discord guild membership for ${discordProviderId}: ${response.status}`);

      return true;
    }

    return true;
  } catch (error) {
    logger.error('Error checking Discord guild membership:', error);

    return true;
  }
}

/**
 * Process Discord mentions in webhook content
 * @param content Original content with usernames
 * @param mentionUsernames Array of usernames to convert to Discord mentions or profile links
 * @returns Content with usernames replaced by Discord mentions or Thinky profile links
 */
export async function processDiscordMentions(content: string, mentionUsernames: string[]): Promise<string> {
  if (!mentionUsernames || mentionUsernames.length === 0) {
    return content;
  }

  try {
    // Get user IDs for the mentioned usernames
    const users = await UserModel.find(
      { name: { $in: mentionUsernames } },
      { _id: 1, name: 1 }
    ).lean<Pick<User, '_id' | 'name'>[]>();

    if (users.length === 0) {
      return content;
    }

    // Get Discord user IDs for the users
    const userIds = users.map(user => user._id);
    const discordUserMappings = await getDiscordUserIdMappings(userIds);

    // Create a map of username -> Discord user ID (for users with Discord connected
    // who are still members of the server - a mention for someone who has left
    // renders as "@unknown-user", so we fall back to their Thinky profile instead)
    const usernameToDiscordId: Record<string, string> = {};
    const usersWithDiscord = new Set<string>();

    await Promise.all(users.map(async user => {
      const mapping = discordUserMappings.find(m => m.userId.toString() === user._id.toString());

      if (mapping && await isDiscordGuildMember(mapping.discordId)) {
        usernameToDiscordId[user.name] = mapping.discordId;
        usersWithDiscord.add(user.name);
      }
    }));

    // Replace usernames with Discord mentions or profile links
    let processedContent = content;

    users.forEach(user => {
      // Use word boundaries to ensure we only replace whole words
      // Use negative lookbehind to avoid matching usernames within URLs (e.g., thinky.gg/username/levelname)
      // Use case-insensitive flag to match MongoDB collation behavior (strength: 2)
      const regex = new RegExp(`(?<!/)\\b${user.name}\\b`, 'i');

      if (usersWithDiscord.has(user.name)) {
        // User has Discord connected - use Discord mention
        const discordId = usernameToDiscordId[user.name];

        processedContent = processedContent.replace(regex, `<@${discordId}>`);
      } else {
        // User doesn't have Discord connected - link to their Thinky profile
        processedContent = processedContent.replace(regex, `[${user.name}](https://thinky.gg/profile/${user.name})`);
      }
    });

    return processedContent;
  } catch (error) {
    // If Discord lookup fails, just use the original content
    console.error('Failed to lookup Discord users for mentions:', error);

    return content;
  }
}
