import { NextApiResponse } from 'next';
import apiWrapper, { NextApiRequestWrapper, ValidType } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import { getUserByProviderId, upsertUserAuthProvider } from '../../../helpers/userAuthHelpers';
import dbConnect from '../../../lib/dbConnect';
import getTokenCookie, { getTokenCookieForDiscordEmbed, getTokenCookieValue } from '../../../lib/getTokenCookie';
import { captureEvent } from '../../../lib/posthogServer';
import { AuthProvider } from '../../../models/db/userAuth';
import { UserModel } from '../../../models/mongoose';

// Endpoint to handle Discord token exchange for embedded activities
const handleDiscordTokenExchange = apiWrapper({
  POST: {
    body: {
      code: ValidType('string'),
      frameId: ValidType('string', false),
      channelId: ValidType('string', false),
      guildId: ValidType('string', false),
    }
  }
}, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
  await dbConnect();

  const { code, frameId, channelId, guildId } = req.body;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.error('Discord OAuth not configured');

    return res.status(500).json({ error: 'Discord OAuth not configured' });
  }

  logger.info('Discord token exchange attempt:', {
    hasCode: !!code,
    frameId,
    channelId,
    guildId,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    host: req.headers.host,
  });

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${req.headers.origin}/api/auth/discord/callback`, // Use the same redirect URI as regular OAuth
      }),
    });

    if (!tokenResponse.ok) {
      let errorData;

      try {
        errorData = await tokenResponse.text();
      } catch (e) {
        errorData = 'Failed to read error response';
      }

      logger.error('Discord token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData,
      });

      return res.status(401).json({ error: 'Token exchange failed' });
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
      logger.error('Discord user fetch failed:', {
        status: userResponse.status,
        statusText: userResponse.statusText,
      });

      return res.status(401).json({ error: 'Failed to fetch user info' });
    }

    const discordUser = await userResponse.json();

    // Check if this Discord account is already linked to a user
    const existingAuth = await getUserByProviderId(AuthProvider.DISCORD, discordUser.id);

    if (existingAuth) {
      console.log('!!! Existing auth', existingAuth);
      // Double-check the user still exists and is active
      const user = await UserModel.findById(existingAuth.userId);

      if (!user) {
        logger.error('User not found for existing Discord auth (stale UserAuth record):', {
          discordUserId: discordUser.id,
          userId: existingAuth.userId,
        });

        // Treat as not found, prompt for signup/linking
        return res.status(404).json({
          error: 'No account found',
          action: 'signup',
          discordUser: {
            id: discordUser.id,
            username: discordUser.username,
            email: discordUser.email,
            avatar: discordUser.avatar,
          }
        });
      }

      // Update the auth provider with new tokens
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

      // Set session cookie with proper domain for Discord embeds
      const tokenCookie = getTokenCookieForDiscordEmbed(user._id.toString(), req.headers?.host);

      // For Discord embeds, we need to ensure the cookie is set with the correct domain
      // and that it's accessible from the embed context
      res.setHeader('Set-Cookie', tokenCookie);

      // Also set a test cookie to verify cookie setting works
      const testCookie = `discord_auth_test=${Date.now()}; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`;

      res.setHeader('Set-Cookie', [tokenCookie, testCookie]);

      // Track Discord embedded login
      captureEvent(user._id.toString(), 'User Logged In', {
        login_method: 'oauth',
        oauth_provider: 'discord',
        is_embedded: true,
        frame_id: frameId,
        channel_id: channelId,
        guild_id: guildId,
      });

      logger.info('Discord embedded login successful:', {
        userId: user._id.toString(),
        discordUserId: discordUser.id,
        username: user.name,
        cookieSet: !!tokenCookie,
        host: req.headers?.host,
        origin: req.headers.origin,
        userAgent: req.headers['user-agent'],
      });

      // Test the authentication by making a request to the user API
      try {
        const testUserResponse = await fetch(`${req.headers.origin}/api/user`, {
          headers: {
            Cookie: `token=${getTokenCookieValue(user._id.toString())}`,
          },
        });

        logger.info('Discord auth test - User API response:', {
          status: testUserResponse.status,
          ok: testUserResponse.ok,
        });
      } catch (error) {
        logger.error('Discord auth test - User API error:', error);
      }

      return res.status(200).json({
        access_token,
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
        cookieSet: true,
      });
    } else {
      // No existing user with this Discord account
      // For embedded activities, we might want to create a guest account or return user info for signup
      logger.info('No existing Discord auth found:', {
        discordUserId: discordUser.id,
        discordUsername: discordUser.username,
      });

      return res.status(200).json({
        access_token,
        user: null,
        discordUser: {
          id: discordUser.id,
          username: discordUser.username,
          email: discordUser.email,
          avatar: discordUser.avatar,
        }
      });
    }
  } catch (error) {
    logger.error('Discord token exchange error:', error);

    return res.status(500).json({ error: 'Token exchange failed' });
  }
});

export default handleDiscordTokenExchange;
