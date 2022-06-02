import type { NextApiRequest, NextApiResponse } from 'next';
import Level from '../../../../models/db/level';
import { LevelModel } from '../../../../models/mongoose';
import { LevelUrlQueryParams } from '../../../level/[username]/[slugName]';
import dbConnect from '../../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();

  const { slugName, username } = req.query as LevelUrlQueryParams;
  const level = await getLevelByUrlPath(username, slugName);

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  return res.status(200).json(level);
}

export async function getLevelByUrlPath(username: string, slugName: string): Promise<Level | null> {
  let level;

  try {
    level = await LevelModel.findOne({
      slug: username + '/' + slugName,
      isDraft: false
    }).populate('userId', 'name');
  } catch (err) {
    console.trace(err);
    return null;
  }

  return level;
}
