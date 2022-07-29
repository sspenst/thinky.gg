import type { NextApiRequest, NextApiResponse } from 'next';
import User from '../../../models/db/user';
import { UserModel } from '../../../models/mongoose';
import { cleanUser } from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();

  const users = await getLeaderboard();

  if (!users) {
    return res.status(500).json({
      error: 'Error finding Users',
    });
  }

  return res.status(200).json(users);
}

export async function getLeaderboard() {
  try {
    const users = await UserModel.find<User>({
      score: { $ne: 0 },
      ts: { $exists: true },
    }, '-email -password');

    users.forEach(user => cleanUser(user));

    return users;
  } catch (err) {
    console.trace(err);

    return null;
  }
}
