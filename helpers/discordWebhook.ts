/* istanbul ignore file */
import * as crypto from 'crypto';
import { SaveOptions } from 'mongoose';
import Discord from '../constants/discord';
import isLocal from '../lib/isLocal';
import { queueFetch } from '../pages/api/internal-jobs/worker';

export default async function queueDiscordWebhook(id: string, content: string, options?: SaveOptions) {
  if (isLocal()) {
    return Promise.resolve();
  }

  const tokenToIdMap = {
    [Discord.DevPriv]: process.env.DISCORD_WEBHOOK_TOKEN_DEV_PRIV,
    [Discord.General]: process.env.DISCORD_WEBHOOK_TOKEN_GENERAL,
    [Discord.Levels]: process.env.DISCORD_WEBHOOK_TOKEN_LEVELS,
    [Discord.Multiplayer]: process.env.DISCORD_WEBHOOK_TOKEN_MULTIPLAYER,
    [Discord.NewUsers]: process.env.DISCORD_WEBHOOK_TOKEN_NEW_USERS,
    [Discord.Notifs]: process.env.DISCORD_WEBHOOK_TOKEN_NOTIFS,
  } as Record<string, string | undefined>;

  const token = tokenToIdMap[id];

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
