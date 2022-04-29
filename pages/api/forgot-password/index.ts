import type { NextApiRequest, NextApiResponse } from 'next';
import User from '../../../models/db/user';
import { UserModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';
import getResetPasswordToken from '../../../lib/getResetPasswordToken';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();

  const { email } = req.body;
  const user = await UserModel.findOne<User>({ email });

  if (!user) {
    return res.status(401).json({
      error: 'Incorrect email or password',
    });
  }

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

  const sentMessageInfo = await transporter.sendMail(mailOptions);

  res.status(200).json({ success: sentMessageInfo.rejected.length === 0 });
}
