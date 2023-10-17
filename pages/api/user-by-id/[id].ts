import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/db/user';
import { UserModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {
  query: {
    id: ValidObjectId(),
  }
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
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
    const user = await UserModel.findById(id, { '__v': 0 }).lean<User>();

    if (user) {
      cleanUser(user);
    }

    return user;
  } catch (err) {
    logger.error(err);

    return null;
  }
}
