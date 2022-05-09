import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { LevelModel } from '../../../models/mongoose';
import type { NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
  
  const { id } = req.query;
  const { level } = req.body;

  await dbConnect();

  await LevelModel.updateOne({
    _id: id,
    userId: req.userId,
  }, {
    $set: {
      data: level.data,
      height: level.height,
      leastMoves: 0,
      width: level.width,
    },
  });

  res.status(200).json(level);
});
