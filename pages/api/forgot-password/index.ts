import type { NextApiRequest, NextApiResponse } from 'next';
import User from '../../../models/db/user';
import { UserModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';
import sendPasswordResetEmail from '../../../lib/sendPasswordResetEmail';

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

  const sentMessageInfo = await sendPasswordResetEmail(user);

  res.status(200).json({ success: sentMessageInfo.rejected.length === 0 });
}
