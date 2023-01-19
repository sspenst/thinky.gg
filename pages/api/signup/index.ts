import { ObjectId } from 'bson';
import mongoose from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import Discord from '../../../constants/discord';
import Theme from '../../../constants/theme';
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

export default apiWrapper({ POST: {
  body: {
    email: ValidType('string'),
    name: ValidType('string'),
    password: ValidType('string'),
    tutorialCompletedAt: ValidNumber(false),
  },
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { email, name, password, tutorialCompletedAt } = req.body;

  await dbConnect();

  const trimmedEmail = email.trim();
  const userWithEmail = await UserModel.findOne<User>({ email: trimmedEmail }, '+email +password');

  if (userWithEmail) {
    // if the user exists but there is no ts, send them an email so they sign up with the existing account
    if (!userWithEmail.ts) {
      const sentMessageInfo = await sendPasswordResetEmail(req, userWithEmail);

      return res.status(400).json({ error: sentMessageInfo.rejected.length === 0 ? 'We tried emailing you a reset password link. If you still have problems please contact Pathology devs via Discord.' : 'Error trying to register. Please contact pathology devs via Discord' });
    } else {
      return res.status(401).json({
        error: 'Email already exists',
      });
    }
  }

  const trimmedName = name.trim();
  const userWithUsername = await UserModel.findOne<User>({ name: trimmedName });

  if (userWithUsername) {
    return res.status(401).json({
      error: 'Username already exists',
    });
  }

  const session = await mongoose.startSession();

  try {
    const id = new ObjectId();

    await session.withTransaction(async () => {
      const [userCreated] = await Promise.all([
        UserModel.create([{
          _id: id,
          calc_records: 0,
          email: trimmedEmail,
          name: trimmedName,
          password: password,
          score: 0,
          ts: TimerUtil.getTs(),
        }], {
          session: session,
        }),
        UserConfigModel.create([{
          _id: new ObjectId(),
          theme: Theme.Modern,
          userId: id,
          tutorialCompletedAt: tutorialCompletedAt,
        }], {
          session: session,
        }),
      ]);

      const user = userCreated[0] as User;

      await queueDiscordWebhook(Discord.GeneralId, `**${trimmedName}** just registered! Welcome them on their [profile](${req.headers.origin}${getProfileSlug(user)})!`, { session: session });
    });
    session.endSession();

    return res.setHeader('Set-Cookie', getTokenCookie(id.toString(), req.headers?.host))
      .status(200).json({ success: true });
  } catch (err) {
    logger.error(err);
    session.endSession();

    return res.status(500).json({
      error: 'Error creating user',
    });
  }
});
