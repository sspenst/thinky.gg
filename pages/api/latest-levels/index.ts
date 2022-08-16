import type { NextApiRequest, NextApiResponse } from 'next';
import { enrichLevelsWithUserStats } from '../../../helpers/enrichLevelsWithUserStats';
import { logger } from '../../../helpers/logger';
import { cleanUser } from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { LevelModel } from '../../../models/mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const token = req?.cookies?.token;
  const user = token ? await getUserFromToken(token) : null;
  const levels = await getLatestLevels(user);

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels',
    });
  }

  return res.status(200).json(levels);
}

export async function getLatestLevels(req_user: User | null = null) {
  await dbConnect();

  try {
    const levels = await LevelModel.find<Level>({ isDraft: false }, '_id slug leastMoves name userId', { lean: false })
      .populate('userId', '-email -password')
      .sort({ ts: -1 })
      .limit(10);

    levels.forEach(level => cleanUser(level.userId));

    const enriched = await enrichLevelsWithUserStats(levels, req_user);

    return enriched;
  } catch (err) {
    logger.trace(err);

    return null;
  }
}
