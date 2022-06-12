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

  if (!req.query) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  await dbConnect();

  try {
    const levels = await LevelModel
      .find<Level>({ isDraft: false, userId: id }, 'name slug')
      .sort({ name: 1 });

    if (!levels) {
      return res.status(500).json({
        error: 'Error finding Levels by userId',
      });
    }

    return res.status(200).json(levels);
  } catch (e){
    return res.status(500).json({
      error: 'Error finding Levels by userId',
    });
  }
}
