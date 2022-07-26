import type { NextApiRequest, NextApiResponse } from 'next';
import User from '../../../models/db/user';
import { UserModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();

  try {
    const users = await UserModel.find<User>({
      score: { $ne: 0 },
      ts: { $exists: true },
    }, 'avatarUpdatedAt calc_records name score ts');

    if (!users) {
      return res.status(500).json({
        error: 'Error finding Users',
      });
    }

    return res.status(200).json(users);
  } catch (e) {
    return res.status(500).json({
      error: 'Error finding Users',
    });
  }
}
