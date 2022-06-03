import isLocal from '../lib/isLocal';

export default async function discordWebhook(content: string) {
  if (isLocal()) {
    return new Promise(() => { return; });
  }

  return fetch(`https://discord.com/api/webhooks/975953104581296128/${process.env.DISCORD_WEBHOOK_TOKEN}`, {
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
