import { AuthProvider } from '@root/models/db/userAuth'; // adjust import as needed
import { UserAuthModel } from '@root/models/mongoose';
import { NextApiResponse } from 'next';
import apiWrapper, { NextApiRequestWrapper } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import { getUserFromToken } from '../../../lib/withAuth';

// Debug endpoint to check authentication status
const handleDiscordDebug = apiWrapper({
  GET: {}
}, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
  const token = req.cookies?.token;

  logger.info('Discord debug request:', {
    hasToken: !!token,
    tokenLength: token?.length,
    cookies: req.cookies,
    headers: {
      origin: req.headers.origin,
      host: req.headers.host,
      userAgent: req.headers['user-agent'],
    },
  });

  if (!token) {
    return res.status(200).json({
      authenticated: false,
      reason: 'No token cookie found',
      cookies: req.cookies,
    });
  }

  try {
    const user = await getUserFromToken(token, req);

    if (!user) {
      return res.status(200).json({
        authenticated: false,
        reason: 'Invalid token',
        tokenLength: token.length,
      });
    }

    const discordAuth = await UserAuthModel.findOne({
      userId: user._id,
      provider: AuthProvider.DISCORD,
    });

    // if discordAuth is false we should remove the token cookie
    if (!discordAuth) {
      res.setHeader('Set-Cookie', 'token=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0');

      return res.status(401).json({
        authenticated: false,
        reason: 'Discord auth not found',
        tokenLength: token.length,
      });
    }

    return res.status(200).json({
      authenticated: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      discordLinked: !!discordAuth,
      tokenLength: token.length,
    });
  } catch (error) {
    logger.error('Discord debug error:', error);

    return res.status(200).json({
      authenticated: false,
      reason: 'Error validating token',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default handleDiscordDebug;
