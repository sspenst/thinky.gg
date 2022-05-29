import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../lib/dbConnect';
import Level from '../../../../models/db/level';
import { LevelModel } from '../../../../models/mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("A")
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }console.log("B")

  const { userId, levelName } = req.query;

  await dbConnect();
  console.log("C")
  const level = await LevelModel.findOne<Level>({ isDraft: false, userId: userId, name:levelName }, 'name');
  console.log("D")
  if (!level) {
    return res.status(500).json({
      error: 'Error finding Level by userId/levelName',
    });
  }
  console.log("E")
  return res.status(200).json(level);
}
