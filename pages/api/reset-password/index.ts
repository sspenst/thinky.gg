import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import { UserModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';
import decodeResetPasswordToken from '../../../lib/decodeResetPasswordToken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  if (!req.body) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  await dbConnect();

  const { password, token, userId } = req.body;

  if (!password || !token || !userId) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  const user = await UserModel.findById(new ObjectId(userId));

  if (!user) {
    return res.status(400).json({
      error: 'Error finding User',
    });
  }

  try {
    if (userId !== decodeResetPasswordToken(token, user)) {
      return res.status(401).json({
        error: 'Malformed token',
      });
    }
  } catch (e) {
    return res.status(401).json({
      error: 'Invalid token',
    });
  }

  user.password = password;

  await user.save();

  return res.status(200).json({ success: true });
}
