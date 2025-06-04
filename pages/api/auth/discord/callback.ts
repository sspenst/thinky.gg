import { NextApiResponse } from 'next';
import apiWrapper, { NextApiRequestWrapper, ValidType } from '../../../../helpers/apiWrapper';
import { logger } from '../../../../helpers/logger';
import { getUserByProviderId, upsertUserAuthProvider } from '../../../../helpers/userAuthHelpers';
import dbConnect from '../../../../lib/dbConnect';
import getTokenCookie from '../../../../lib/getTokenCookie';
import { AuthProvider } from '../../../../models/db/userAuth';
import { UserModel } from '../../../../models/mongoose';

// Endpoint to handle Discord OAuth callback without authentication
const handleDiscordCallback = apiWrapper({
  GET: {
    query: {
      code: ValidType('string'),
      state: ValidType('string', false),
    }
  }
}, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
  await dbConnect();

  const { code, state } = req.query;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${req.headers.origin}/api/auth/discord/callback`;

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'Discord OAuth not configured' });

    return;
  }

  let origin = req.headers.origin;

  // Fallback to constructing origin from host if origin header is missing
  if (!origin) {
    const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.headers.host;

    origin = `${protocol}://${host}`;
  }

  // Parse state to get original origin if available
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());

      if (stateData.origin) {
        origin = stateData.origin;
      }
    } catch (e) {
      logger.error('Failed to parse Discord OAuth state:', e);
    }
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri,
        scope: 'identify email',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Discord token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token } = tokenData;

    // Get user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Discord user fetch failed: ${userResponse.statusText}`);
    }

    const discordUser = await userResponse.json();

    // Check if user is logged in to associate Discord with their account
    const token = req.cookies?.token;

    if (token) {
      // User is logged in - link Discord account to existing user
      const { getUserFromToken } = await import('../../../../lib/withAuth');
      const user = await getUserFromToken(token, req);

      if (!user) {
        res.redirect(`${origin}/login?error=session_expired`);

        return;
      }

      // Link Discord account to existing user using new UserAuth model
      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : undefined;

      await upsertUserAuthProvider(user._id, AuthProvider.DISCORD, {
        providerId: discordUser.id,
        providerUsername: discordUser.username,
        providerEmail: discordUser.email,
        providerAvatarUrl: avatarUrl,
        accessToken: access_token,
        refreshToken: refresh_token,
      });

      // Redirect to settings with success message
      res.redirect(`${origin}/settings?discord_connected=true#connections`);
    } else {
      // User not logged in - check if Discord account is already linked to a user
      const existingAuth = await getUserByProviderId(AuthProvider.DISCORD, discordUser.id);

      if (existingAuth) {
        // Login the user
        const user = await UserModel.findById(existingAuth.userId);

        if (user) {
          const tokenCookie = getTokenCookie(user._id.toString(), req.headers?.host);

          res.setHeader('Set-Cookie', tokenCookie);

          // Check for redirect URL in session storage (handled by frontend)
          res.redirect(`${origin}/?discord_login=success`);

          return;
        }
      }

      // No existing user with this Discord account - redirect to signup with Discord info
      const signupUrl = `${origin}/signup?discord_temp=${encodeURIComponent(JSON.stringify({
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordEmail: discordUser.email,
        discordAvatarHash: discordUser.avatar,
        access_token,
        refresh_token
      }))}`;

      res.redirect(signupUrl);
    }
  } catch (error) {
    logger.error('Discord OAuth callback error:', error);
    res.redirect(`${origin}/login?discord_error=true`);
  }
});

export default handleDiscordCallback;
