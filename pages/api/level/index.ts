import { LevelModel, WorldModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import type { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import World from '../../../models/db/world';
import dbConnect from '../../../lib/dbConnect';
import getTs from '../../../helpers/getTs';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    const { authorNote, name, worldId } = req.body;

    await dbConnect();

    const world = await WorldModel.findById<World>(worldId);

    if (!world) {
      return res.status(404).json({
        error: 'World not found',
      });
    }

    if (world.userId.toString() !== req.userId) {
      return res.status(401).json({
        error: 'Not authorized to add a level to this World',
      });
    }

    const levelId = new ObjectId();

    await Promise.all([
      LevelModel.create({
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
        worldId: worldId
      }),
      WorldModel.updateOne({
        _id: worldId,
      }, {
        $addToSet: {
          levels: levelId,
        },
      })
    ]);

    res.status(200).json({ success: true });
  } catch(err) {
    res.status(500).json({
      error: 'Error creating level',
    });
  }
});
