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

  if (!email) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  const user = await UserModel.findOne<User>({ email });

  if (!user) {
    return res.status(404).json({
      error: 'Could not find an account with this email',
    });
  }

  try {
    const sentMessageInfo = await sendPasswordResetEmail(req, user);

    if (!sentMessageInfo) {
      return res.status(500).json({
        error: 'Could not send password reset email',
      });
    }

    return res.status(200).json({ success: sentMessageInfo.rejected.length === 0 });

  } catch (e) {
    return res.status(500).json({
      error: 'Could not send password reset email',
    });
  }

}
