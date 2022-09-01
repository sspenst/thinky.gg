import { ObjectId } from 'bson';
import type { NextApiResponse } from 'next';
import { enrichLevels } from '../../../helpers/enrich';
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

export default withAuth({ methods: ['GET', 'PUT', 'DELETE'] }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
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

    const enrichedCollectionLevels = await enrichLevels(collection.levels, req.user);
    const newCollection = JSON.parse(JSON.stringify(collection));

    newCollection.levels = enrichedCollectionLevels;

    return res.status(200).json(newCollection);
  } else if (req.method === 'PUT') {
    const { id } = req.query;
    const { authorNote, name, levels } = req.body as UpdateLevelParams;

    if (!authorNote && !name && !levels) {
      res.status(400).json({ error: 'Missing required fields' });

      return;
    }

    const setObj: UpdateLevelParams = {};

    if (authorNote) {
      setObj.authorNote = authorNote.trim();
    }

    if (name) {
      setObj.name = name.trim();
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
      runValidators: true,
    }).populate({ path: 'levels' });

    if (!collection) {
      return res.status(401).json({ error: 'User is not authorized to perform this action' });
    }

    const enrichedCollectionLevels = await enrichLevels(collection.levels, req.user);
    const newCollection = JSON.parse(JSON.stringify(collection));

    newCollection.levels = enrichedCollectionLevels;

    return res.status(200).json(newCollection);
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

    return res.status(200).json({ updated: true });
  }
});
