import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { LevelModel } from '../../../models/mongoose';
import type { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import dbConnect from '../../../lib/dbConnect';
import getTs from '../../../helpers/getTs';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    if (!req.body) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    const { authorNote, name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    await dbConnect();

    const levelId = new ObjectId();

    await LevelModel.create({
      _id: levelId,
      authorNote: authorNote,
      data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000003',
      height: 10,
      isDraft: true,
      leastMoves: 0,
      name: name,
      points: 0,
      ts: getTs(),
      userId: req.userId,
      width: 10,
    });

    return res.status(200).json({ success: true, _id: levelId });
  } catch (err) {
    return res.status(500).json({
      error: 'Error creating level ' + err,
    });
  }
});
