import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { LevelModel } from '../../../models/mongoose';
import type { NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  await dbConnect();
  
  const levels = await LevelModel.find<Level>({
    userId: req.userId,
    worldId: id,
  }).sort({ name: 1 });

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels',
    });
  }

  res.status(200).json(levels);
});
