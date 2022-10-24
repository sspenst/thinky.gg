import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';
import { enrichLevels } from '../../../helpers/enrich';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const token = req.cookies?.token;
  const reqUser = token ? await getUserFromToken(token) : null;
  const levels = await getLatestLevels(reqUser);

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels',
    });
  }

  return res.status(200).json(levels);
});

export async function getLatestLevels(reqUser: User | null = null) {
  await dbConnect();

  try {
    const levels = await LevelModel.find<Level>({ isDraft: false }, '_id slug leastMoves name userId ts calc_difficulty_estimate', { lean: false })
      .populate('userId')
      .sort({ ts: -1 })
      .limit(25);

    levels.forEach(level => cleanUser(level.userId));

    const enriched = await enrichLevels(levels, reqUser);

    return enriched;
  } catch (err) {
    logger.error(err);

    return null;
  }
}
