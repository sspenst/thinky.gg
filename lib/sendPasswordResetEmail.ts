import { Types } from 'mongoose';
import { NextApiRequest } from 'next';
import { EmailType } from '../constants/emailDigest';
import User from '../models/db/user';
import { sendMail } from '../pages/api/internal-jobs/email-digest';
import getResetPasswordToken from './getResetPasswordToken';

export default async function sendPasswordResetEmail(req: NextApiRequest, user: User) {
  const token = getResetPasswordToken(user);
  const url = `${req.headers.origin}/reset-password/${user._id}/${token}`;

  return await sendMail(
    new Types.ObjectId(),
    EmailType.EMAIL_PASSWORD_RESET,
    user,
    `Password Reset - ${user.name}`,
    `Click here to reset your password: ${url}`,
  );
}
