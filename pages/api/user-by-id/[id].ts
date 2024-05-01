import { GameId } from '@root/constants/GameId';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import apiWrapper, { NextApiRequestWrapper, ValidObjectId } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/db/user';
import { UserModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {
  query: {
    id: ValidObjectId(),
  }
} }, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
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
  const game = getGameFromId(gameId);

  try {
    const userAgg = await UserModel.aggregate<User>([
      {
        $project: {
          ...USER_DEFAULT_PROJECTION,
          lastGame: 1,
          ts: 1,
        },
      },
      { $match: { _id: new Types.ObjectId(id as string) } },
      ...(game.isNotAGame ? [] : getEnrichUserConfigPipelineStage(gameId)),
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
