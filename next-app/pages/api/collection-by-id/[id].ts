import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId } from '../../../helpers/apiWrapper';
import { enrichLevels } from '../../../helpers/enrich';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Collection from '../../../models/db/collection';
import User from '../../../models/db/user';
import { CollectionModel } from '../../../models/mongoose';

export default apiWrapper({
  GET: {
    query: {
      id: ValidObjectId(true)
    }
  } }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  await dbConnect();
  const token = req.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const collection = await getCollectionById(id as string, reqUser);

  if (!collection) {
    return res.status(404).json({
      error: 'Error finding Collection',
    });
  }

  return res.status(200).json(collection);
});

export async function getCollectionById(id: string, reqUser: User | null) {
  const collection = await CollectionModel.findById<Collection>(id)
    .populate({
      path: 'levels',
      match: { isDraft: false },
      populate: { path: 'userId', model: 'User', select: 'name' },
    })
    .populate('userId', 'name');

  if (!collection) {
    return null;
  }

  const enrichedCollectionLevels = await enrichLevels(collection.levels, reqUser);
  const newCollection = JSON.parse(JSON.stringify(collection));

  newCollection.levels = enrichedCollectionLevels;

  return newCollection;
}
