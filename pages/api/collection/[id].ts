import { ObjectId } from 'bson';
import type { NextApiResponse } from 'next';
import { enrichLevelsWithUserStats } from '../../../helpers/enrichLevelsWithUserStats';
import { logger } from '../../../helpers/logger';
import revalidateUniverse from '../../../helpers/revalidateUniverse';
import dbConnect from '../../../lib/dbConnect';
import getCollectionUserIds from '../../../lib/getCollectionUserIds';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Collection from '../../../models/db/collection';
import { CollectionModel } from '../../../models/mongoose';

type UpdateLevelParams = {
  name?: string,
  authorNote?: string,
  levels?: (string | ObjectId)[],
}

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        error: 'Missing id',
      });
    }

    await dbConnect();

    const collection = await CollectionModel.findOne<Collection>({
      _id: id,
      userId: { $in: getCollectionUserIds(req.user) },
    }).populate({ path: 'levels' });

    if (!collection) {
      return res.status(404).json({
        error: 'Error finding Collection',
      });
    }

    if (!collection) {
      return res.status(404).json({
        error: 'Error finding Collection',
      });
    }

    const enrichedCollectionLevels = await enrichLevelsWithUserStats(collection.levels, req.user);
    const new_collection = (collection as any).toObject();

    new_collection.levels = enrichedCollectionLevels;

    return res.status(200).json(new_collection);
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

    const collection = await CollectionModel.findOneAndUpdate({
      _id: id,
      userId: { $in: getCollectionUserIds(req.user) },
    }, {
      $set: setObj,
    }, {
      new: true,
    }).populate({ path: 'levels' });

    if (!collection) {
      return res.status(401).json({ error: 'User is not authorized to perform this action' });
    }

    if (revalidate) {
      try {
        const revalidateRes = await revalidateUniverse(res, req.userId, false);

        if (!revalidateRes) {
          throw 'Error revalidating universe';
        } else {
          return res.status(200).json(collection);
        }
      } catch (err) {
        logger.trace(err);

        return res.status(500).json({
          error: 'Error revalidating api/collection/[id] ' + err,
        });
      }
    } else {
      return res.status(200).json(collection);
    }
  } else if (req.method === 'DELETE') {
    const { id } = req.query;

    const collection = await CollectionModel.findById<Collection>(id);

    if (!collection) {
      return res.status(404).json({
        error: 'Collection not found',
      });
    }

    if (!collection.userId || collection.userId.toString() !== req.userId) {
      return res.status(401).json({
        error: 'Not authorized to delete this Collection',
      });
    }

    await CollectionModel.deleteOne({ _id: id });

    try {
      const revalidateRes = await revalidateUniverse(res, req.userId, false);

      if (!revalidateRes) {
        throw 'Error revalidating universe';
      } else {
        return res.status(200).json({ updated: true });
      }
    } catch (err) {
      logger.trace(err);

      return res.status(500).json({
        error: 'Error revalidating api/collection/[id] ' + err,
      });
    }
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
