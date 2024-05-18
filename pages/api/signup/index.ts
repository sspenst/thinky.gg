import { EmailDigestSettingType } from '@root/constants/emailDigest';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import NotificationType from '@root/constants/notificationType';
import Role from '@root/constants/role';
import { generatePassword } from '@root/helpers/generatePassword';
import getEmailConfirmationToken from '@root/helpers/getEmailConfirmationToken';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import dbConnect from '@root/lib/dbConnect';
import sendEmailConfirmationEmail from '@root/lib/sendEmailConfirmationEmail';
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
import User from '../../../models/db/user';
import { UserConfigModel, UserModel } from '../../../models/mongoose';

async function createUser({ gameId, email, name, password, tutorialCompletedAt, utm_source, roles }: {gameId: GameId, email: string, name: string, password: string, tutorialCompletedAt: number, utm_source: string, roles: Role[]}, queryOptions: QueryOptions): Promise<[User, UserConfig]> {
  const id = new Types.ObjectId();
  const disallowedEmailNotifications = [
    NotificationType.NEW_FOLLOWER,
    NotificationType.NEW_LEVEL,
    NotificationType.NEW_LEVEL_ADDED_TO_COLLECTION,
    NotificationType.NEW_REVIEW_ON_YOUR_LEVEL,
    NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_SOLVED,
  ];

  const [userCreated, configCreated] = await Promise.all([
    UserModel.create([{
      _id: id,
      disallowedEmailNotifications: disallowedEmailNotifications,
      disallowedPushNotifications: [],
      email: email,
      emailConfirmationToken: getEmailConfirmationToken(),
      emailConfirmed: false,
      emailDigest: EmailDigestSettingType.DAILY,
      name: name,
      password: password,
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

export default apiWrapper({ POST: {
  body: {
    guest: ValidType('boolean', false),
    email: ValidType('string'),
    name: ValidType('string'),
    password: ValidType('string'),
    tutorialCompletedAt: ValidNumber(false),
  },
} }, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
  await dbConnect();

  const { email, name, password, tutorialCompletedAt, guest, utm_source } = req.body;

  let trimmedEmail: string, trimmedName: string, passwordValue: string;

  if (guest) {
    trimmedName = 'Guest-' + Math.floor(Math.random() * 100000000);
    trimmedEmail = trimmedName + '@guest.com';
    passwordValue = generatePassword();
  } else {
    trimmedEmail = email.trim();
    trimmedName = name.trim();
    passwordValue = password;
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

  try {
    await session.withTransaction(async () => {
      const [user] = await createUser({
        email: trimmedEmail,
        gameId: req.gameId,
        name: trimmedName,
        password: passwordValue,
        tutorialCompletedAt: tutorialCompletedAt,
        roles: guest ? [Role.GUEST] : [],
        utm_source: utm_source,
      }, { session: session });

      if (!user) {
        throw new Error('Error creating user');
      }

      id = user._id;

      await Promise.all([
        !guest && sendEmailConfirmationEmail(req, user),
        queueDiscordWebhook(DiscordChannel.NewUsers, `**${trimmedName}** just registered! Welcome them on their [profile](${req.headers.origin}${getProfileSlug(user)})!`, { session: session }),
      ]);
    });
    session.endSession();

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
