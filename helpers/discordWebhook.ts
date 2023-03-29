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
    [Discord.LevelsId]: process.env.DISCORD_WEBHOOK_TOKEN_LEVELS,
    [Discord.NotifsId]: process.env.DISCORD_WEBHOOK_TOKEN_NOTIFS,
    [Discord.GeneralId]: process.env.DISCORD_WEBHOOK_TOKEN_PATHOLOGY,
    [Discord.DevPriv]: process.env.DISCORD_WEBHOOK_TOKEN_DEVPRIV,
  } as Record<string, string | undefined>;

  const token = tokenToIdMap[id];

  if (!token) {
    return Promise.resolve();
  }

  const dedupeHash = crypto.createHash('sha256').update(content).digest('hex');

  return queueFetch(`https://discord.com/api/webhooks/${id}/${token}`, {
    method: 'POST',
    body: JSON.stringify({
      content: content,
    }),
    headers: {
      'Content-Type': 'application/json'
    },
  }, dedupeHash, options);
}
