import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import type { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import { WorldModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    const { authorNote, name } = req.body;

    await dbConnect();

    const world = await WorldModel.create({
      _id: new ObjectId(),
      authorNote: authorNote,
      name: name,
      userId: req.userId,
    });

    res.status(200).json(world);
  } catch(err) {
    res.status(500).json({
      error: 'Error creating world',
    });
  }
});
