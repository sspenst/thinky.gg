import type { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../../../../helpers/logger';
import dbConnect from '../../../../lib/dbConnect';
import { LevelModel } from '../../../../models/mongoose';
import { LevelUrlQueryParams } from '../../../level/[username]/[slugName]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { slugName, username } = req.query as LevelUrlQueryParams;
  const level = await getLevelByUrlPath(username, slugName);

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  return res.status(200).json(level);
}

export async function getLevelByUrlPath(username: string, slugName: string) {
  await dbConnect();

  try {
    return await LevelModel.findOne({
      slug: username + '/' + slugName,
      isDraft: false
    }).populate('userId', 'name');
  } catch (err) {
    logger.trace(err);

    return null;
  }
}
