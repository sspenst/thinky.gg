import type { NextApiRequest, NextApiResponse } from 'next';
import World from '../../../models/db/world';
import { WorldModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  await dbConnect();
  const world = await WorldModel.findOne<World>({ _id: id })
    .populate({ path: 'levels', match: { isDraft: false }, populate: { path: 'userId', model:'User', select: 'name' } });
  const levels = world?.levels;

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels',
    });
  }

  return res.status(200).json(levels);
}
