import { NextApiResponse } from 'next';
import apiWrapper, { NextApiRequestWrapper } from '../../../../helpers/apiWrapper';

export default apiWrapper({
  GET: {}
}, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.headers.origin}/api/auth/google/callback`;

  if (!clientId) {
    res.status(500).json({ error: 'Google client ID not configured' });

    return;
  }

  const scope = 'openid profile email';
  const state = Buffer.from(JSON.stringify({
    origin: req.headers.origin,
    timestamp: Date.now()
  })).toString('base64');

  const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    'response_type=code&' +
    `scope=${encodeURIComponent(scope)}&` +
    `state=${state}`;

  res.redirect(googleAuthUrl);
});
