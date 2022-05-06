import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import type { NextApiResponse } from 'next';
import World from '../../../models/db/world';
import { WorldModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();
  
  const worlds = await WorldModel.find<World>({ userId: req.userId }).sort({ name: 1 });

  if (!worlds) {
    return res.status(500).json({
      error: 'Error finding Worlds',
    });
  }

  res.status(200).json(worlds);
});
