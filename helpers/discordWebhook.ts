/* istanbul ignore file */
import * as crypto from 'crypto';
import { SaveOptions } from 'mongoose';
import DiscordChannel from '../constants/discordChannel';
import isLocal from '../lib/isLocal';
import { queueFetch } from '../pages/api/internal-jobs/worker';

export default async function queueDiscordWebhook(id: DiscordChannel, content: string, options?: SaveOptions) {
  if (isLocal()) {
    return Promise.resolve();
  }

  const tokenToIdMap = {
    [DiscordChannel.DevPriv]: process.env.DISCORD_WEBHOOK_TOKEN_DEV_PRIV,
    [DiscordChannel.General]: process.env.DISCORD_WEBHOOK_TOKEN_GENERAL,
    [DiscordChannel.NewUsers]: process.env.DISCORD_WEBHOOK_TOKEN_NEW_USERS,
    [DiscordChannel.Pathology]: process.env.DISCORD_WEBHOOK_TOKEN_PATHOLOGY,
    [DiscordChannel.PathologyMultiplayer]: process.env.DISCORD_WEBHOOK_TOKEN_PATHOLOGY_MULTIPLAYER,
    [DiscordChannel.PathologyNotifs]: process.env.DISCORD_WEBHOOK_TOKEN_PATHOLOGY_NOTIFS,
    [DiscordChannel.Sokopath]: process.env.DISCORD_WEBHOOK_TOKEN_SOKOBAN,
    [DiscordChannel.SokopathMultiplayer]: process.env.DISCORD_WEBHOOK_TOKEN_SOKOBAN_MULTIPLAYER,
    [DiscordChannel.SokopathNotifs]: process.env.DISCORD_WEBHOOK_TOKEN_SOKOBAN_NOTIFS,
  } as Record<string, string | undefined>;

  const token = tokenToIdMap[id as string];

  if (!token) {
    return Promise.resolve();
  }

  const dedupeHash = crypto.createHash('sha256').update(content).digest('hex');

  return queueFetch(`https://discord.com/api/webhooks/${id}/${token}?wait=true`, {
    method: 'POST',
    body: JSON.stringify({
      content: content,
    }),
    headers: {
      'Content-Type': 'application/json'
    },
  }, dedupeHash, options);
}
