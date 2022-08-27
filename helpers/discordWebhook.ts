import Discord from '../constants/discord';
import isLocal from '../lib/isLocal';

/* istanbul ignore next */
export default async function discordWebhook(id: string, content: string) {
  if (isLocal()) {
    return Promise.resolve();
  }

  const token = id === Discord.LevelsId ? process.env.DISCORD_WEBHOOK_TOKEN_LEVELS :
    id === Discord.NotifsId ? process.env.DISCORD_WEBHOOK_TOKEN_NOTIFS : undefined;

  if (!token) {
    return Promise.resolve();
  }

  return fetch(`https://discord.com/api/webhooks/${id}/${token}`, {
    method: 'POST',
    body: JSON.stringify({
      content: content,
    }),
    headers: {
      'Content-Type': 'application/json'
    },
  }).then(res => {
    if (res.status !== 204) {
      throw res.text();
    }
  }).catch(err => {
    console.error(err);
  });
}
