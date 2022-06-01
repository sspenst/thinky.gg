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

  let level: Level | null = null;

  try {
    level = await LevelModel.findById<Level>(id)
      .populate('userId', 'name');
  } catch (e) {
    return res.status(400).json({
      error: 'Error casting id to ObjectId',
      e: e,
    });
  }

  if (!level) {
    return res.status(404).json({
      error: 'Error finding Level',
    });
  }

  return res.status(200).json(level);
}
