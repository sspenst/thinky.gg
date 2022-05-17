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

  const { id } = req.query;

  await dbConnect();

  const user = await UserModel.findById<User>(id, '-password');

  if (!user) {
    return res.status(500).json({
      error: 'Error finding User',
    });
  }

  res.status(200).json(user);
}
