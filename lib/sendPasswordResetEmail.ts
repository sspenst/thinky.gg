import { NextApiRequest } from 'next';
import User from '../models/db/user';
import getResetPasswordToken from './getResetPasswordToken';
import nodemailer from 'nodemailer';

export default async function sendPasswordResetEmail(req: NextApiRequest, user: User) {
  const pathologyEmail = 'pathology.do.not.reply@gmail.com';
  const token = getResetPasswordToken(user);
  const url = `${req.headers.origin}/reset-password/${user._id}/${token}`;

  if (!process.env.EMAIL_PASSWORD) {
    throw 'EMAIL_PASSWORD not defined';
  }

  // NB: less secure apps will no longer be available on may 30, 2022:
  // https://support.google.com/accounts/answer/6010255
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: pathologyEmail,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: pathologyEmail,
    to: user.email,
    subject: `Pathology password reset - ${user.name}`,
    text: `Click here to reset your password: ${url}`,
  };

  return await transporter.sendMail(mailOptions);
}
