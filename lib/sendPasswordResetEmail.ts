import User from '../models/db/user';
import getResetPasswordToken from './getResetPasswordToken';
import nodemailer from 'nodemailer';

export default async function sendPasswordResetEmail(user: User) {
  const token = getResetPasswordToken(user);

  // NB: less secure apps will no longer be available on may 30, 2022:
  // https://support.google.com/accounts/answer/6010255
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'pathology.do.not.reply@gmail.com',
        pass: process.env.EMAIL_PASSWORD,
    },
  });

  const domain = process.env.LOCAL ? 'http://localhost:3000' : 'https://pathology.sspenst.com';
  const url = `${domain}/reset-password/${user._id}/${token}`;

  const mailOptions = {
    from: 'pathology.do.not.reply@gmail.com',
    to: user.email,
    subject: `Pathology password reset - ${user.name}`,
    text: `Click here to reset your password: ${url}`,
  };

  return await transporter.sendMail(mailOptions);
}
