import { NextApiResponse } from 'next';
import apiWrapper, { NextApiRequestWrapper } from '../../../../helpers/apiWrapper';
import { logger } from '../../../../helpers/logger';

export default apiWrapper({
  GET: {}
}, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
  const clientId = process.env.DISCORD_CLIENT_ID;

  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${req.headers.origin ?? 'http://localhost:3000'}/api/auth/discord/callback`;

  if (!clientId) {
    res.status(500).json({ error: 'Discord client ID not configured' });

    return;
  }

  // Debug logging to help diagnose the issue
  logger.info('Discord OAuth initiation:', {
    hasToken: !!req.cookies?.token,
    origin: req.headers.origin,
    host: req.headers.host,
    userAgent: req.headers['user-agent'],
    referer: req.headers.referer,
    redirectUri,
    clientId,
  });

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
