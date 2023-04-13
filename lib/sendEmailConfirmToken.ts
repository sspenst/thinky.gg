import EmailLog from '@root/models/db/emailLog';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import { EmailLogModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { NextApiRequest } from 'next';
import { EmailType } from '../constants/emailDigest';
import { sendMail } from '../pages/api/internal-jobs/email-digest';

export default async function sendEmailConfirmationEmail(req: NextApiRequest, user: User, userConfig: UserConfig) {
  const token = userConfig.emailConfirmationToken;

  const url = `${req.headers.origin}/confirm-email/${user._id}/${token}`;

  const lastSent = await EmailLogModel.findOne({
    userId: user._id,
    type: EmailType.EMAIL_CONFIRM_EMAIL,
  }).sort({ createdAt: -1 }) as EmailLog;

  if (lastSent) {
    const lastSentTime = new Date(lastSent.createdAt).getTime();
    const timeSinceLastSent = Date.now() - lastSentTime;

    // if it's been less than 2 minutes since the last email was sent, don't send another one
    if (timeSinceLastSent < 1000 * 60 * 2) {
      throw new Error('Please wait a couple minutes before requesting another email confirmation');
    }
  }

  return await sendMail(
    new Types.ObjectId(),
    EmailType.EMAIL_CONFIRM_EMAIL,
    user,
    `Confirm Email - ${user.name}`,
    `Click here to confirm your email: ${url}`,
  );
}