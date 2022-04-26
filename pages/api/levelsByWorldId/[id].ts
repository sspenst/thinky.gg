import type { NextApiRequest, NextApiResponse } from 'next';
import Level from '../../../models/db/level';
import { LevelModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  await dbConnect();
  
  const levels = await LevelModel.find<Level>({ worldId: id }, '_id leastMoves name points');

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels',
    });
  }

  levels.sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  res.status(200).json(levels);
}
