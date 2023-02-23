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
  } as Record<string, string | undefined>;

  const token = tokenToIdMap[id];

  if (!token) {
    return Promise.resolve();
  }

  const dedupeHash = crypto.createHash('sha256').update(content).digest('hex');

  // Surround all urls with <>, so they don't get auto-embedded
  const contentCleaned = content.replace(/(https?:\/\/[^\s]+)/g, '<$1>');

  return queueFetch(`https://discord.com/api/webhooks/${id}/${token}`, {
    method: 'POST',
    body: JSON.stringify({
      content: contentCleaned,
    }),
    headers: {
      'Content-Type': 'application/json'
    },
  }, dedupeHash, options);
}
