import type { NextApiRequest, NextApiResponse } from 'next';
import User from '../../../models/db/user';
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

  const world = await WorldModel.findById<World>(id).populate<{userId: User}>('userId', '_id isOfficial name');

  if (!world) {
    return res.status(404).json({
      error: 'Error finding World',
    });
  }

  return res.status(200).json(world);
}
