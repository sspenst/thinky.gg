import { NextApiResponse } from 'next';
import apiWrapper, { NextApiRequestWrapper, ValidType } from '../../../../helpers/apiWrapper';
import { logger } from '../../../../helpers/logger';
import { getUserByProviderId, upsertUserAuthProvider } from '../../../../helpers/userAuthHelpers';
import dbConnect from '../../../../lib/dbConnect';
import getTokenCookie from '../../../../lib/getTokenCookie';
import { captureEvent } from '../../../../lib/posthogServer';
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

  // Debug logging to compare login vs settings flow
  logger.info('Discord OAuth callback:', {
    hasToken: !!req.cookies?.token,
    origin: req.headers.origin,
    host: req.headers.host,
    constructedOrigin: origin,
    redirectUri,
    state,
    code: code ? 'present' : 'missing',
  });

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
      let errorData;

      try {
        errorData = await tokenResponse.text();
      } catch (e) {
        errorData = 'Failed to read error response';
      }

      // Log the complete request details for debugging
      logger.error('Discord token exchange failed - Full details:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData,
        requestBody: {
          client_id: clientId,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          scope: 'identify email',
          code_present: !!code,
        },
        headers: tokenResponse.headers ? Object.fromEntries(tokenResponse.headers.entries()) : 'unavailable',
      });

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
        // clear token cookie
        res.setHeader('Set-Cookie', 'token=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict');

        res.redirect(`${origin}/login?error=session_expired`);

        return;
      }

      // Check if this Discord account is already linked to ANY user
      const existingAuth = await getUserByProviderId(AuthProvider.DISCORD, discordUser.id);

      if (existingAuth) {
        // Discord account is already linked
        if (existingAuth.userId.toString() === user._id.toString()) {
          // Already linked to current user - show "already connected" message
          res.redirect(`${origin}/settings?discord_already_connected=true#connections`);

          return;
        } else {
          // Linked to different user - show error
          res.redirect(`${origin}/settings?discord_error=already_linked#connections`);

          return;
        }
      }

      // Discord account is not linked to anyone - proceed with linking
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

      // Track Discord account linking
      captureEvent(user._id.toString(), 'OAuth Account Linked', {
        provider: 'discord',
        provider_username: discordUser.username,
        is_linking: true,
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

          // Track Discord OAuth login
          captureEvent(user._id.toString(), 'User Logged In', {
            login_method: 'oauth',
            oauth_provider: 'discord',
          });

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
