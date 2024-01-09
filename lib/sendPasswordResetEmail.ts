import { Games } from '@root/constants/Games';
import getEmailBody from '@root/helpers/getEmailBody';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import EmailLog from '@root/models/db/emailLog';
import { EmailLogModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { NextApiRequest } from 'next';
import { EmailType } from '../constants/emailDigest';
import User from '../models/db/user';
import { sendMail } from '../pages/api/internal-jobs/email-digest';
import getResetPasswordToken from './getResetPasswordToken';

export default async function sendPasswordResetEmail(req: NextApiRequest, user: User) {
  const token = getResetPasswordToken(user);
  const url = `${req.headers.origin}/reset-password/${user._id}?token=${encodeURIComponent(token)}`;
  const gameId = getGameIdFromReq(req);
  const game = Games[gameId];

  const lastSent = await EmailLogModel.findOne<EmailLog>({
    userId: user._id,
    type: EmailType.EMAIL_PASSWORD_RESET,
  }).sort({ createdAt: -1 });

  if (lastSent) {
    const lastSentTime = new Date(lastSent.createdAt).getTime();
    const timeSinceLastSent = Date.now() - lastSentTime;

    // if it's been less than 2 minutes since the last email was sent, don't send another one
    if (timeSinceLastSent < 1000 * 60) {
      throw new Error('Please wait a minute before requesting another password reset');
    }
  }

  return await sendMail(
    gameId,
    new Types.ObjectId(),
    EmailType.EMAIL_PASSWORD_RESET,
    user,
    `${game.displayName} - Password Reset - ${user.name}`,
    getEmailBody({
      gameId: gameId,
      linkHref: url,
      linkText: 'Reset Password',
      message: 'Someone requested a password reset for your Pathology account',
      title: 'Forgot Password',
      user: user,
    }),
  );
}
