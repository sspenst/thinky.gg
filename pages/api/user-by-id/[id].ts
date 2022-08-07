import type { NextApiRequest, NextApiResponse } from 'next';
import { cleanUser } from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/db/user';
import { UserModel } from '../../../models/mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;
  const user = await getUserById(id);

  if (!user) {
    return res.status(500).json({
      error: 'Error finding User',
    });
  }

  return res.status(200).json(user);
}

export async function getUserById(id: string | string[] | undefined) {
  await dbConnect();

  try {
    const user = await UserModel.findById<User>(id, '-email -password', { lean: true });

    if (user) {
      cleanUser(user);
    }

    return user;
  } catch (err) {
    console.trace(err);

    return null;
  }
}
