import { NextApiResponse } from 'next';
import apiWrapper, { NextApiRequestWrapper, ValidType } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import { getUserByProviderId, upsertUserAuthProvider } from '../../../helpers/userAuthHelpers';
import dbConnect from '../../../lib/dbConnect';
import getTokenCookie from '../../../lib/getTokenCookie';
import { captureEvent } from '../../../lib/posthogServer';
import { AuthProvider } from '../../../models/db/userAuth';
import { UserModel } from '../../../models/mongoose';

// Endpoint to handle Discord embedded activity authentication
const handleDiscordEmbeddedAuth = apiWrapper({
  POST: {
    body: {
      userToken: ValidType('string'),
      userId: ValidType('string'),
      frameId: ValidType('string', false),
      channelId: ValidType('string', false),
      guildId: ValidType('string', false),
    }
  }
}, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
  await dbConnect();

  const { userToken, userId, frameId, channelId, guildId } = req.body;

  logger.info('Discord embedded auth attempt:', {
    hasUserToken: !!userToken,
    userId,
    frameId,
    channelId,
    guildId,
    userAgent: req.headers['user-agent'],
  });

  try {
    // Validate the user token with Discord's API
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    if (!userResponse.ok) {
      logger.error('Discord user token validation failed:', {
        status: userResponse.status,
        statusText: userResponse.statusText,
      });

      return res.status(401).json({
        error: 'Invalid Discord user token'
      });
    }

    const discordUser = await userResponse.json();

    // Verify the user ID matches what Discord returned
    if (discordUser.id !== userId) {
      logger.error('Discord user ID mismatch:', {
        providedUserId: userId,
        discordUserId: discordUser.id,
      });

      return res.status(400).json({
        error: 'User ID mismatch'
      });
    }

    // Check if this Discord account is already linked to a user
    const existingAuth = await getUserByProviderId(AuthProvider.DISCORD, discordUser.id);

    if (existingAuth) {
      // Login the existing user
      const user = await UserModel.findById(existingAuth.userId);

      if (!user) {
        logger.error('User not found for existing Discord auth:', {
          discordUserId: discordUser.id,
          userId: existingAuth.userId,
        });

        return res.status(500).json({
          error: 'User account not found'
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
        accessToken: userToken,
        refreshToken: undefined, // Discord embedded doesn't provide refresh tokens
      });

      // Set session cookie
      const tokenCookie = getTokenCookie(user._id.toString(), req.headers?.host);

      res.setHeader('Set-Cookie', tokenCookie);

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
      });

      return res.status(200).json({
        success: true,
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
        }
      });
    } else {
      // No existing user with this Discord account
      // For embedded activities, we might want to create a guest account or redirect to signup
      logger.info('No existing Discord auth found, redirecting to signup:', {
        discordUserId: discordUser.id,
        discordUsername: discordUser.username,
      });

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
  } catch (error) {
    logger.error('Discord embedded auth error:', error);

    return res.status(500).json({
      error: 'Authentication failed'
    });
  }
});

export default handleDiscordEmbeddedAuth;
