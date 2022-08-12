import { ObjectId } from 'bson';
import type { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../../../helpers/logger';
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

  if (!id || !ObjectId.isValid(id.toString())) {
    return res.status(400).json({
      error: 'Invalid id',
    });
  }

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
    logger.trace(err);

    return null;
  }
}
