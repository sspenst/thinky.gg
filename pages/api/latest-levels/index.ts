import type { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../../../helpers/logger';
import { cleanUser } from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import Level from '../../../models/db/level';
import { LevelModel } from '../../../models/mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const levels = await getLatestLevels();

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels',
    });
  }

  return res.status(200).json(levels);
}

export async function getLatestLevels() {
  await dbConnect();

  try {
    const levels = await LevelModel.find<Level>({ isDraft: false }, {}, { lean: false })
      .populate('userId', '-email -password')
      .sort({ ts: -1 })
      .limit(10);

    levels.forEach(level => cleanUser(level.userId));

    return levels;
  } catch (err) {
    logger.trace(err);

    return null;
  }
}
