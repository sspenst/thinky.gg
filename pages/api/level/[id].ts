import type { NextApiRequest, NextApiResponse } from 'next';
import Level from '../../../models/db/level';
import { LevelModel } from '../../../models/mongoose';
import Pack from '../../../models/db/pack';
import User from '../../../models/db/user';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  await dbConnect();
  
  const level = await LevelModel.findById<Level>(id)
    .populate<{leastMovesUserId: User}>('leastMovesUserId', 'name')
    .populate<{officialUserId: User}>('officialUserId', 'name')
    .populate<{packId: Pack}>('packId', '_id name')
    .populate<{userId: User}>('userId', '_id name');

  if (!level) {
    return res.status(500).json({
      error: 'Error finding Level',
    });
  }

  res.status(200).json(level);
}
