/* istanbul ignore file */
import * as crypto from 'crypto';
import { SaveOptions } from 'mongoose';
import DiscordChannel from '../constants/discordChannel';
import isLocal from '../lib/isLocal';
import User from '../models/db/user';
import { UserModel } from '../models/mongoose';
import { queueFetch } from '../pages/api/internal-jobs/worker';
import { getDiscordUserIds } from './userAuthHelpers';

export default async function queueDiscordWebhook(
  id: DiscordChannel,
  content: string,
  options?: SaveOptions,
  mentionUsernames?: string[]
) {
  if (isLocal()) {
    return Promise.resolve();
  }

  const tokenToIdMap = {
    [DiscordChannel.DevPriv]: process.env.DISCORD_WEBHOOK_TOKEN_DEV_PRIV,
    [DiscordChannel.General]: process.env.DISCORD_WEBHOOK_TOKEN_GENERAL,
    [DiscordChannel.NewUsers]: process.env.DISCORD_WEBHOOK_TOKEN_NEW_USERS,
    [DiscordChannel.Pathology]: process.env.DISCORD_WEBHOOK_TOKEN_PATHOLOGY,
    [DiscordChannel.PathologyLevels]: process.env.DISCORD_WEBHOOK_TOKEN_PATHOLOGY_LEVELS,
    [DiscordChannel.PathologyMultiplayer]: process.env.DISCORD_WEBHOOK_TOKEN_PATHOLOGY_MULTIPLAYER,
    [DiscordChannel.PathologyNotifs]: process.env.DISCORD_WEBHOOK_TOKEN_PATHOLOGY_NOTIFS,
    [DiscordChannel.Sokopath]: process.env.DISCORD_WEBHOOK_TOKEN_SOKOPATH,
    [DiscordChannel.SokopathLevels]: process.env.DISCORD_WEBHOOK_TOKEN_SOKOPATH_LEVELS,
    [DiscordChannel.SokopathMultiplayer]: process.env.DISCORD_WEBHOOK_TOKEN_SOKOPATH_MULTIPLAYER,
    [DiscordChannel.SokopathNotifs]: process.env.DISCORD_WEBHOOK_TOKEN_SOKOPATH_NOTIFS,
  } as Record<string, string | undefined>;

  const token = tokenToIdMap[id as string];

  if (!token) {
    return Promise.resolve();
  }

  let finalContent = content;

  // Handle mentions if usernames are provided
  if (mentionUsernames && mentionUsernames.length > 0) {
    try {
      // Get user IDs for the mentioned usernames
      const users = await UserModel.find(
        { name: { $in: mentionUsernames } },
        { _id: 1, name: 1 }
      ).lean<Pick<User, '_id' | 'name'>[]>();

      if (users.length > 0) {
        // Get Discord user IDs for these users
        const userIds = users.map(user => user._id);
        const discordUserIds = await getDiscordUserIds(userIds);

        // Create a map of username -> Discord user ID
        const discordIdMap = new Map<string, string>();

        users.forEach((user, index) => {
          if (discordUserIds[index]) {
            discordIdMap.set(user.name, discordUserIds[index]);
          }
        });

        // Replace usernames in the content with Discord mentions
        mentionUsernames.forEach(username => {
          const discordId = discordIdMap.get(username);

          if (discordId) {
            // Replace all occurrences of the username with Discord mention
            // Use word boundaries to avoid partial matches
            const regex = new RegExp(`\\b${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');

            finalContent = finalContent.replace(regex, `<@${discordId}>`);
          }
        });
      }
    } catch (error) {
      // If Discord lookup fails, just use the original content
      console.error('Failed to lookup Discord users for mentions:', error);
    }
  }

  const dedupeHash = crypto.createHash('sha256').update(finalContent).digest('hex');

  return queueFetch(`https://discord.com/api/webhooks/${id}/${token}?wait=true`, {
    method: 'POST',
    body: JSON.stringify({
      content: finalContent,
    }),
    headers: {
      'Content-Type': 'application/json'
    },
  }, dedupeHash, options);
}
