import { ObjectId } from 'bson';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/db/user';
import { UserModel } from '../../../models/mongoose';

export default apiWrapper({ methods: ['GET'] }, async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  if (!req.query) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  const { id } = req.query;

  if (!id || !ObjectId.isValid(id.toString())) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  const user = await getUserById(id);

  if (!user) {
    return res.status(404).json({
      error: 'Error finding User',
    });
  }

  return res.status(200).json(user);
});

export async function getUserById(id: string | string[] | undefined) {
  await dbConnect();

  try {
    const user = await UserModel.findById<User>(id, '-email -password', { lean: true });

    if (user) {
      cleanUser(user);
    }

    return user;
  } catch (err) {
    logger.error(err);

    return null;
  }
}
