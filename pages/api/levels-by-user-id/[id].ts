import type { NextApiRequest, NextApiResponse } from 'next';
import Level from '../../../models/db/level';
import { LevelModel } from '../../../models/mongoose';
import User from '../../../models/db/user';
import World from '../../../models/db/world';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  await dbConnect();

  const levels = await LevelModel.find<Level>({ isDraft: false, userId: id }, '_id name')
    .populate<{officialUserId: User}>('officialUserId', '_id isOfficial name')
    .populate<{userId: User}>('userId', '_id name')
    .populate<{worldId: World}>('worldId', '_id name userId')
    .sort({ name: 1 });

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels by userId',
    });
  }

  return res.status(200).json(levels);
}
