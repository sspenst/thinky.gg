import { NextApiResponse } from 'next';
import apiWrapper, { NextApiRequestWrapper } from '../../../../helpers/apiWrapper';

export default apiWrapper({
  GET: {}
}, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${req.headers.origin}/api/auth/discord/callback`;

  if (!clientId) {
    res.status(500).json({ error: 'Discord client ID not configured' });

    return;
  }

  const scope = 'identify email';
  const state = Buffer.from(JSON.stringify({
    origin: req.headers.origin,
    timestamp: Date.now()
  })).toString('base64');

  const discordAuthUrl = 'https://discord.com/api/oauth2/authorize?' +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    'response_type=code&' +
    `scope=${scope}&` +
    `state=${state}`;

  res.redirect(discordAuthUrl);
});
