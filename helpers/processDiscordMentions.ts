import { Types } from 'mongoose';
import User from '../models/db/user';
import { AuthProvider } from '../models/db/userAuth';
import { UserAuthModel, UserModel } from '../models/mongoose';

/**
 * Get Discord user ID mappings for given user IDs
 * @param userIds Array of user ObjectIds
 * @returns Array of mappings with userId and discordId
 */
async function getDiscordUserIdMappings(userIds: (Types.ObjectId | string)[]): Promise<Array<{ userId: Types.ObjectId; discordId: string }>> {
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

    // Create a map of username -> Discord user ID (for users with Discord connected)
    const usernameToDiscordId: Record<string, string> = {};
    const usersWithDiscord = new Set<string>();

    users.forEach(user => {
      const mapping = discordUserMappings.find(m => m.userId.toString() === user._id.toString());

      if (mapping) {
        usernameToDiscordId[user.name] = mapping.discordId;
        usersWithDiscord.add(user.name);
      }
    });

    // Replace usernames with Discord mentions or profile links
    let processedContent = content;

    users.forEach(user => {
      // Use word boundaries to ensure we only replace whole words
      // Use case-insensitive flag to match MongoDB collation behavior (strength: 2)
      const regex = new RegExp(`\\b${user.name}\\b`, 'gi');

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
