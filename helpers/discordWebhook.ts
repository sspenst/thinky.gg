/* istanbul ignore file */
import * as crypto from 'crypto';
import { SaveOptions } from 'mongoose';
import DiscordChannel from '../constants/discordChannel';
import isLocal from '../lib/isLocal';
import { queueDiscord } from '../pages/api/internal-jobs/worker/queueFunctions';

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

  const dedupeHash = crypto.createHash('sha256').update(content + JSON.stringify(mentionUsernames || [])).digest('hex');

  return queueDiscord(
    id as string,
    token,
    content,
    mentionUsernames,
    dedupeHash,
    options
  );
}
