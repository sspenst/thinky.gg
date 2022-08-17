import type { NextApiRequest, NextApiResponse } from 'next';
import { enrichLevelsWithUserStats } from '../../../helpers/enrichLevelsWithUserStats';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Collection from '../../../models/db/collection';
import User from '../../../models/db/user';
import { CollectionModel } from '../../../models/mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      error: 'Missing id',
    });
  }

  await dbConnect();
  const token = req?.cookies?.token;
  const req_user = token ? await getUserFromToken(token) : null;
  const collection = await getCollectionById(id as string, req_user);

  if (!collection) {
    return res.status(404).json({
      error: 'Error finding Collection',
    });
  }

  return res.status(200).json(collection);
}

export async function getCollectionById(id: string, req_user?: User | null) {
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

  const enrichedCollectionLevels = await enrichLevelsWithUserStats(collection.levels, req_user);
  const new_collection = (collection as any).toObject();

  new_collection.levels = enrichedCollectionLevels;

  return new_collection;
}
