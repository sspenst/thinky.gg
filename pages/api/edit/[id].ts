import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
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
  const { data, height, width } = req.body;

  await dbConnect();

  const level = await LevelModel.findById<Level>(id);

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  if (level.userId.toString() !== req.userId) {
    return res.status(401).json({
      error: 'Not authorized to edit this Level',
    });
  }

  if (!level.isDraft) {
    return res.status(400).json({
      error: 'Cannot edit a published level',
    });
  }

  await LevelModel.updateOne({ _id: id }, { $set: {
    data: data,
    height: height,
    leastMoves: 0,
    width: width,
  }});

  res.status(200).json(level);
});
