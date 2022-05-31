import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import type { NextApiResponse } from 'next';
import World from '../../../models/db/world';
import { WorldModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';
import revalidateUniverse from '../../../helpers/revalidateUniverse';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'PUT') {
    const { id } = req.query;
    const { authorNote, name } = req.body;

    await dbConnect();

    await WorldModel.updateOne({
      _id: id,
      userId: req.userId,
    }, {
      $set: {
        authorNote: authorNote,
        name: name,
      },
    });

    return await revalidateUniverse(req, res, false);
  } else if (req.method === 'DELETE') {
    const { id } = req.query;

    const world = await WorldModel.findById<World>(id);

    if (!world) {
      return res.status(404).json({
        error: 'World not found',
      });
    }

    if (world.userId.toString() !== req.userId) {
      return res.status(401).json({
        error: 'Not authorized to delete this World',
      });
    }

    await WorldModel.deleteOne({ _id: id });

    return await revalidateUniverse(req, res, false);
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
