import getEmailBody from '@root/helpers/getEmailBody';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import EmailLog from '@root/models/db/emailLog';
import User from '@root/models/db/user';
import { EmailLogModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { NextApiRequest } from 'next';
import { EmailType } from '../constants/emailDigest';
import { sendMail } from '../pages/api/internal-jobs/email-digest';

export default async function sendEmailConfirmationEmail(req: NextApiRequest, user: User) {
  const token = user.emailConfirmationToken;
  const url = `${req.headers.origin}/confirm-email/${user._id}/${token}`;
  const gameId = getGameIdFromReq(req);
  const lastSent = await EmailLogModel.findOne<EmailLog>({
    userId: user._id,
    type: EmailType.EMAIL_CONFIRM_EMAIL,
  }).sort({ createdAt: -1 });

  if (lastSent) {
    const lastSentTime = new Date(lastSent.createdAt).getTime();
    const timeSinceLastSent = Date.now() - lastSentTime;

    // if it's been less than 2 minutes since the last email was sent, don't send another one
    if (timeSinceLastSent < 1000 * 60) {
      throw new Error('Please wait a minute before requesting another email confirmation');
    }
  }

  return await sendMail(gameId,
    new Types.ObjectId(),
    EmailType.EMAIL_CONFIRM_EMAIL,
    user,
    `Confirm Email - ${user.name}`,
    getEmailBody({
      gameId: gameId,
      linkHref: url,
      linkText: 'Confirm Email',
      message: 'Hello there ' + user.name + ', please confirm your email to access more features!',
      title: 'Confirm your email',
      user: user,
    }),
  );
}
