import Role from '@root/constants/role';
import { generatePassword } from '@root/helpers/generatePassword';
import sendEmailConfirmationEmail from '@root/lib/sendEmailConfirmationEmail';
import UserConfig from '@root/models/db/userConfig';
import mongoose, { QueryOptions, Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import Discord from '../../../constants/discord';
import apiWrapper, { ValidNumber, ValidType } from '../../../helpers/apiWrapper';
import queueDiscordWebhook from '../../../helpers/discordWebhook';
import getProfileSlug from '../../../helpers/getProfileSlug';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import getTokenCookie from '../../../lib/getTokenCookie';
import sendPasswordResetEmail from '../../../lib/sendPasswordResetEmail';
import User from '../../../models/db/user';
import { UserConfigModel, UserModel } from '../../../models/mongoose';
import { getNewUserConfig } from '../user-config';

async function createUser({ email, name, password, tutorialCompletedAt, roles }: {email: string, name: string, password: string, tutorialCompletedAt: number, roles: Role[]}, queryOptions: QueryOptions): Promise<[User, UserConfig]> {
  const id = new Types.ObjectId();

  const [userCreated, configCreated] = await Promise.all([
    UserModel.create([{
      _id: id,
      email: email,
      name: name,
      password: password,
      roles: roles,
      score: 0,
      ts: TimerUtil.getTs(),
    }], queryOptions),
    UserConfigModel.create([getNewUserConfig(roles, tutorialCompletedAt, id)], queryOptions),
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
    recaptchaToken: ValidType('string', false),
  },
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { email, name, password, tutorialCompletedAt, recaptchaToken, guest } = req.body;

  await dbConnect();
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
      logger.error('Error validating recaptcha', recaptchaData);

      return res.status(400).json({ error: 'Error validating recaptcha [Status: ' + recaptchaResponse.status + ']' });
    }
  }

  let trimmedEmail: string, trimmedName: string, passwordValue: string;

  if (guest) {
    trimmedName = 'Guest-' + Math.floor(Math.random() * 1000000);
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

      return res.status(400).json({ error: !err ? 'We tried emailing you a reset password link. If you still have problems please contact Pathology devs via Discord.' : 'Error trying to register. Please contact pathology devs via Discord' });
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
      const [user, userConfig] = await createUser({
        email: trimmedEmail,
        name: trimmedName,
        password: passwordValue,
        tutorialCompletedAt: tutorialCompletedAt,
        roles: guest ? [Role.GUEST] : [],
      }, { session: session });

      if (!user) {
        throw new Error('Error creating user');
      }

      id = user._id;

      await Promise.all([
        !guest && sendEmailConfirmationEmail(req, user, userConfig as UserConfig),
        queueDiscordWebhook(Discord.NewUsers, `**${trimmedName}** just registered! Welcome them on their [profile](${req.headers.origin}${getProfileSlug(user)})!`, { session: session }),
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
