import * as crypto from 'crypto';
import Discord from '../constants/discord';
import isLocal from '../lib/isLocal';
import { queueFetch } from '../pages/api/internal-jobs/worker';

/* istanbul ignore next */
export default async function queueDiscordWebhook(id: string, content: string) {
  if (isLocal()) {
    return Promise.resolve();
  }

  const token = id === Discord.LevelsId ? process.env.DISCORD_WEBHOOK_TOKEN_LEVELS :
    id === Discord.NotifsId ? process.env.DISCORD_WEBHOOK_TOKEN_NOTIFS : undefined;

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
  }, dedupeHash);
}
