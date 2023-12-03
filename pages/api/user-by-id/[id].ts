import { GameId } from '@root/constants/GameId';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import apiWrapper, { NextApiRequestGuest, ValidObjectId } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/db/user';
import { UserModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {
  query: {
    id: ValidObjectId(),
  }
} }, async (req: NextApiRequestGuest, res: NextApiResponse) => {
  const { id } = req.query;
  const user = await getUserById(id, req.gameId);

  if (!user) {
    return res.status(404).json({
      error: 'Error finding User',
    });
  }

  return res.status(200).json(user);
});

export async function getUserById(id: string | string[] | undefined, gameId: GameId) {
  await dbConnect();

  try {
    const userAgg = await UserModel.aggregate<User>([
      { $match: { _id: new Types.ObjectId(id as string) } },
      ...getEnrichUserConfigPipelineStage(gameId, { includeCalcs: true }),
    ]);

    if (!userAgg.length) {
      return null;
    }

    const user = userAgg[0];

    if (user) {
      cleanUser(user);
    }

    return user;
  } catch (err) {
    logger.error(err);

    return null;
  }
}
