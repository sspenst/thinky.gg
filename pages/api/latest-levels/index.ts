import type { NextApiRequest, NextApiResponse } from 'next';
import Level from '../../../models/db/level';
import { LevelModel } from '../../../models/mongoose';
import User from '../../../models/db/user';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();
  
  const levels = await LevelModel.find<Level>({ isDraft: { $ne: true } })
    .populate<{userId: User}>('userId', '_id name')
    .sort({ ts: -1 })
    .limit(10);

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels',
    });
  }

  res.status(200).json(levels);
}
