import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import type { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import World from '../../../models/db/world';
import { WorldModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';
import revalidateUniverse from '../../../helpers/revalidateUniverse';

type UpdateLevelParams = {
  name?: string,
  authorNote?: string,
  levels?: (string | ObjectId)[]

}
export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'PUT') {
    const { id } = req.query;
    const { authorNote, name, levels } = req.body as UpdateLevelParams;

    if (!authorNote && !name && !levels) {
      res.status(400).json({ error: 'Missing required fields' });

      return;
    }

    const setObj:UpdateLevelParams = {};

    if (authorNote) {
      setObj.authorNote = authorNote;
    }

    if (name) {
      setObj.name = name;
    }

    if (levels) {
      setObj.levels = (levels as string[]).map(i => new ObjectId(i));
    }

    await dbConnect();

    const resp = await WorldModel.updateOne({
      _id: id,
      userId: req.userId,
    }, {
      $set: setObj,
    });

    if (resp.modifiedCount === 0) {
      return res.status(401).json({ error: 'User is not authorized to perform this action' });
    }

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
