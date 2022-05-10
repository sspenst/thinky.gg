import { LevelModel, UserModel } from '../../../models/mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import { FilterQuery } from 'mongoose';
import Level from '../../../models/db/level';
import User from '../../../models/db/user';
import World from '../../../models/db/world';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  await dbConnect();

  const universe = await UserModel.findOne<User>({ _id: id }, 'isOfficial name');

  if (!universe) {
    throw new Error(`Error finding User ${id}`);
  }

  const filter: FilterQuery<Level> = { isDraft: { $ne: true }};

  if (universe.isOfficial) {
    filter['officialUserId'] = id;
  } else {
    filter['userId'] = id;
  }

  const levels = await LevelModel.find<Level>(filter, '_id worldId')
    .populate<{worldId: World}>('worldId', '_id name');

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels by userId',
    });
  }

  res.status(200).json(levels);
}
