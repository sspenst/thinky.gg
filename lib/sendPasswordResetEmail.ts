import User from '../models/db/user';
import getResetPasswordToken from './getResetPasswordToken';
import nodemailer from 'nodemailer';

export default async function sendPasswordResetEmail(user: User) {
  const pathologyEmail = 'pathology.do.not.reply@gmail.com';
  const token = getResetPasswordToken(user);
  const url = `${process.env.URI}/reset-password/${user._id}/${token}`;

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
