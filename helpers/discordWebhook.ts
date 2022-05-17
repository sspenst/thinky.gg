export default function discordWebhook(content: string) {
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
