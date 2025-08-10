import { EmailDigestSettingType } from '@root/constants/emailDigest';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import NotificationType from '@root/constants/notificationType';
import PrivateTagType from '@root/constants/privateTagType';
import Role from '@root/constants/role';
import { initializeDisposableEmailDomains, isDisposableEmailDomain } from '@root/helpers/disposableEmailDomains';
import { generatePassword } from '@root/helpers/generatePassword';
import getEmailConfirmationToken from '@root/helpers/getEmailConfirmationToken';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import { upsertUserAuthProvider } from '@root/helpers/userAuthHelpers';
import dbConnect from '@root/lib/dbConnect';
import { captureEvent } from '@root/lib/posthogServer';
import sendEmailConfirmationEmail from '@root/lib/sendEmailConfirmationEmail';
import { AuthProvider } from '@root/models/db/userAuth';
import UserConfig from '@root/models/db/userConfig';
import mongoose, { QueryOptions, Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import DiscordChannel from '../../../constants/discordChannel';
import apiWrapper, { NextApiRequestWrapper, ValidNumber, ValidType } from '../../../helpers/apiWrapper';
import queueDiscordWebhook from '../../../helpers/discordWebhook';
import getProfileSlug from '../../../helpers/getProfileSlug';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import getTokenCookie from '../../../lib/getTokenCookie';
import sendPasswordResetEmail from '../../../lib/sendPasswordResetEmail';
import KeyValue from '../../../models/db/keyValue';
import User from '../../../models/db/user';
import { KeyValueModel, UserConfigModel, UserModel } from '../../../models/mongoose';

async function createUser({ gameId, email, name, password, tutorialCompletedAt, utm_source, roles, emailConfirmed, privateTags }: {gameId: GameId, email: string, name: string, password: string, tutorialCompletedAt: number, utm_source: string, roles: Role[], emailConfirmed?: boolean, privateTags?: PrivateTagType[]}, queryOptions: QueryOptions): Promise<[User, UserConfig]> {
  const id = new Types.ObjectId();
  const disallowedEmailNotifications = [
    /*NotificationType.NEW_FOLLOWER,
    NotificationType.NEW_LEVEL,
    NotificationType.NEW_LEVEL_ADDED_TO_COLLECTION,
    NotificationType.NEW_REVIEW_ON_YOUR_LEVEL,
    NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_SOLVED,*/
  ] as NotificationType[];

  const [userCreated, configCreated] = await Promise.all([
    UserModel.create([{
      _id: id,
      disallowedEmailNotifications: disallowedEmailNotifications,
      disallowedPushNotifications: [],
      email: email,
      emailConfirmationToken: emailConfirmed ? undefined : getEmailConfirmationToken(),
      emailConfirmed: emailConfirmed || false,
      emailDigest: EmailDigestSettingType.DAILY,
      name: name,
      password: password,
      privateTags: privateTags || [],
      roles: roles,
      score: 0,
      ts: TimerUtil.getTs(),
      utm_source: utm_source,
    }], queryOptions),
    UserConfigModel.create([{
      gameId: gameId,
      theme: getGameFromId(gameId).defaultTheme,
      tutorialCompletedAt: tutorialCompletedAt,
      userId: id,
    }], queryOptions),
  ]);

  const user = userCreated[0] as User;
  const userConfig = configCreated[0] as UserConfig;

  return [user, userConfig];
}

async function isEmailDomainAllowed(email: string): Promise<boolean> {
  try {
    // Get the domain from email (everything after @)
    const domain = email.split('@')[1]?.toLowerCase();

    if (!domain) {
      return false; // Invalid email format
    }

    // Initialize disposable email domains on first use
    await initializeDisposableEmailDomains();

    // Check if domain is in the global disposable domains list
    if (isDisposableEmailDomain(domain)) {
      return false;
    }

    // Query for admin-configured disallowed domains
    const disallowedDomainsKV = await KeyValueModel.findOne({
      key: 'DISALLOWED_EMAIL_SIGNUP_DOMAIN',
      gameId: GameId.THINKY
    }).lean<KeyValue>();

    if (!disallowedDomainsKV || !disallowedDomainsKV.value) {
      return true; // No admin restrictions, allow domain (already checked disposable)
    }

    // Parse space-separated domain list
    const disallowedDomains = String(disallowedDomainsKV.value)
      .split(' ')
      .map(d => d.trim().toLowerCase())
      .filter(d => d.length > 0);

    // Check if the email domain is in the admin-configured disallowed list
    return !disallowedDomains.includes(domain);
  } catch (error) {
    logger.error('Error checking email domain:', error);

    return true; // On error, allow signup to proceed
  }
}

export default apiWrapper({ POST: {
  body: {
    email: ValidType('string'),
    guest: ValidType('boolean', false),
    name: ValidType('string'),
    password: ValidType('string'),
    recaptchaToken: ValidType('string', false),
    tutorialCompletedAt: ValidNumber(false),
    oauthData: ValidType('object', false),
  },
} }, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
  await dbConnect();

  const { email, guest, name, password, recaptchaToken, tutorialCompletedAt, utm_source, oauthData } = req.body;

  const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || '';

  if (RECAPTCHA_SECRET && RECAPTCHA_SECRET.length > 0) {
    if (!recaptchaToken) {
      return res.status(400).json({ error: 'Please fill out recaptcha' });
    }

    const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${RECAPTCHA_SECRET}&response=${recaptchaToken}`,
    });

    const recaptchaData = await recaptchaResponse.json();

    if (!recaptchaResponse.ok || !recaptchaData?.success) {
      const errorMessage = `Error validating recaptcha [Status: ${recaptchaResponse.status}], [Data: ${JSON.stringify(recaptchaData)}]`;

      logger.error(errorMessage);

      return res.status(400).json({ error: errorMessage });
    }
  }

  let trimmedEmail: string, trimmedName: string, passwordValue: string;

  if (guest) {
    trimmedName = 'Guest-' + Math.floor(Math.random() * 100000000);
    trimmedEmail = trimmedName + '@guest.com';
    passwordValue = generatePassword();
  } else {
    trimmedEmail = email.trim();
    trimmedName = name.trim();
    passwordValue = oauthData ? generatePassword() : password;
  }

  // Check if email domain is allowed (skip for guest users)
  if (!guest && !(await isEmailDomainAllowed(trimmedEmail))) {
    return res.status(400).json({
      error: 'Email address is not valid',
    });
  }

  const [userWithEmail, userWithUsername] = await Promise.all([UserModel.findOne<User>({ email: trimmedEmail }, '+email +password'), UserModel.findOne<User>({ name: trimmedName })]);

  if (userWithEmail) {
    // if the user exists but there is no ts, send them an email so they sign up with the existing account
    if (!userWithEmail.ts) {
      const err = await sendPasswordResetEmail(req, userWithEmail);
      const game = Games[req.gameId];

      if (err) {
        return res.status(err.status).json({ error: err.message });
      } else {
        return res.status(200).json({ error: 'We tried emailing you a reset password link. If you still have problems please contact ' + game.displayName + ' devs via Discord.' });
      }
    } else {
      return res.status(401).json({
        error: 'Email already exists',
      });
    }
  }

  if (userWithUsername) {
    return res.status(401).json({
      error: 'Username already exists',
    });
  }

  const session = await mongoose.startSession();
  let id = new Types.ObjectId();
  let user: User | null = null;

  try {
    await session.withTransaction(async () => {
      const [createdUser] = await createUser({
        email: trimmedEmail,
        gameId: req.gameId,
        name: trimmedName,
        password: passwordValue,
        tutorialCompletedAt: tutorialCompletedAt,
        roles: guest ? [Role.GUEST] : [],
        utm_source: utm_source,
        emailConfirmed: guest || !!oauthData,
        privateTags: (!guest && !oauthData) ? [PrivateTagType.HAS_PASSWORD] : [],
      }, { session: session });

      if (!createdUser) {
        throw new Error('Error creating user');
      }

      user = createdUser;
      id = createdUser._id;

      // Handle OAuth data if present
      if (oauthData && !guest) {
        try {
          if (oauthData.provider === 'discord') {
            const avatarUrl = oauthData.discordAvatarHash
              ? `https://cdn.discordapp.com/avatars/${oauthData.discordId}/${oauthData.discordAvatarHash}.png`
              : undefined;

            await upsertUserAuthProvider(createdUser._id, AuthProvider.DISCORD, {
              providerId: oauthData.discordId,
              providerUsername: oauthData.discordUsername,
              providerEmail: oauthData.discordEmail,
              providerAvatarUrl: avatarUrl,
              accessToken: oauthData.access_token,
              refreshToken: oauthData.refresh_token,
            });
          } else if (oauthData.provider === 'google') {
            await upsertUserAuthProvider(createdUser._id, AuthProvider.GOOGLE, {
              providerId: oauthData.googleId,
              providerUsername: oauthData.googleUsername,
              providerEmail: oauthData.googleEmail,
              providerAvatarUrl: oauthData.googleAvatarUrl,
              accessToken: oauthData.access_token,
              refreshToken: oauthData.refresh_token,
            });
          }
        } catch (oauthError) {
          logger.error('Error creating OAuth record during signup:', oauthError);
          // Don't fail the entire signup if OAuth linking fails
        }
      }

      await Promise.all([
        !guest && !oauthData && sendEmailConfirmationEmail(req, createdUser),
        queueDiscordWebhook(DiscordChannel.NewUsers, `**${trimmedName}** just registered! Welcome them on their [profile](${req.headers.origin}${getProfileSlug(createdUser)})!`, { session: session }),
      ]);
    });
    session.endSession();

    // Track user registration with PostHog (server-side)
    if (user) {
      const registrationMethod = guest ? 'guest' : (oauthData ? 'oauth' : 'email');

      captureEvent(id.toString(), 'User Registered', {
        registration_method: registrationMethod,
        oauth_provider: oauthData?.provider,
        utm_source: utm_source,
        game_id: req.gameId,
      });
    }

    return res.setHeader('Set-Cookie', getTokenCookie(id.toString(), req.headers?.host))
      .status(200).json({
        success: true,
        ...(guest ? { name: trimmedName, temporaryPassword: passwordValue } : {}),
      });
  } catch (err) {
    logger.error(err);
    session.endSession();

    return res.status(500).json({
      error: 'Error creating user',
    });
  }
});
