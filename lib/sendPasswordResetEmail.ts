import * as aws from '@aws-sdk/client-ses';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { NextApiRequest } from 'next';
import nodemailer from 'nodemailer';
import User from '../models/db/user';
import getResetPasswordToken from './getResetPasswordToken';

export default async function sendPasswordResetEmail(req: NextApiRequest, user: User) {
  if (!process.env.EMAIL_PASSWORD) {
    throw new Error('EMAIL_PASSWORD not defined');
  }

  const pathologyEmail = 'pathology.do.not.reply@gmail.com';
  const token = getResetPasswordToken(user);
  const url = `${req.headers.origin}/reset-password/${user._id}/${token}`;
  const ses = new aws.SES({
    region: 'us-east-1',
    credentials: defaultProvider(),
  });

  const transporter = nodemailer.createTransport({
    SES: { ses, aws },
    sendingRate: 10 // max 10 messages/second
  });

  const mailOptions = {
    from: `Pathology <${pathologyEmail}>`,
    to: user.name + ' <' + user.email + '>',
    subject: `Password Reset - ${user.name}`,
    text: `Click here to reset your password: ${url}`,
  };

  return await transporter.sendMail(mailOptions);
}
