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
  levels?: (string | ObjectId)[],
}

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { id } = req.query;

    await dbConnect();

    const world = await WorldModel.findOne<World>({
      _id: id,
      userId: req.userId,
    }).populate({ path: 'levels' });

    if (!world) {
      return res.status(404).json({
        error: 'Error finding World',
      });
    }

    return res.status(200).json(world);
  } else if (req.method === 'PUT') {
    const { id } = req.query;
    const { authorNote, name, levels } = req.body as UpdateLevelParams;
    let revalidate = false;

    if (!authorNote && !name && !levels) {
      res.status(400).json({ error: 'Missing required fields' });

      return;
    }

    const setObj: UpdateLevelParams = {};

    if (authorNote) {
      setObj.authorNote = authorNote;
      revalidate = true;
    }

    if (name) {
      setObj.name = name;
      revalidate = true;
    }

    if (levels) {
      setObj.levels = (levels as string[]).map(i => new ObjectId(i));
    }

    await dbConnect();

    const world = await WorldModel.findOneAndUpdate({
      _id: id,
      userId: req.userId,
    }, {
      $set: setObj,
    }, {
      new: true,
    }).populate({ path: 'levels' });

    if (!world) {
      return res.status(401).json({ error: 'User is not authorized to perform this action' });
    }

    if (revalidate) {
      try {
        const revalidateRes = await revalidateUniverse(req, false);

        if (revalidateRes.status !== 200) {
          throw await revalidateRes.text();
        } else {
          return res.status(200).json(world);
        }
      } catch (err) {
        console.trace(err);

        return res.status(500).json({
          error: 'Error revalidating api/world/[id] ' + err,
        });
      }
    } else {
      return res.status(200).json(world);
    }
  } else if (req.method === 'DELETE') {
    const { id } = req.query;

    const world = await WorldModel.findById<World>(id);

    if (!world) {
      return res.status(404).json({
        error: 'World not found',
      });
    }

    if (!world.userId || world.userId.toString() !== req.userId) {
      return res.status(401).json({
        error: 'Not authorized to delete this World',
      });
    }

    await WorldModel.deleteOne({ _id: id });

    try {
      const revalidateRes = await revalidateUniverse(req, false);

      if (revalidateRes.status !== 200) {
        throw await revalidateRes.text();
      } else {
        return res.status(200).json({ updated: true });
      }
    } catch (err) {
      console.trace(err);

      return res.status(500).json({
        error: 'Error revalidating api/world/[id] ' + err,
      });
    }
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
