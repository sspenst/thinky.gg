import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import Stat from '@root/models/db/stat';
import { Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId, ValidType } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import { StatModel, UserModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {
  query: {
    all: ValidType('string'),
    id: ValidObjectId(),
  },
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { all, id } = req.query;

  await dbConnect();

  try {
    const stats = await StatModel.aggregate<Stat>([
      { $match: { levelId: new Types.ObjectId(id as string), complete: true } },
      ...(all === 'true' ? [] : [{ $limit: 10 }]),
      { $sort: { ts: -1 } },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
          pipeline: [
            { $project: { ...USER_DEFAULT_PROJECTION } },
          ]
        },
      },
      { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } },
    ]);

    stats.forEach(stat => cleanUser(stat.userId));

    return res.status(200).json(stats);
  } catch (e) {
    logger.error(e);

    return res.status(500).json({
      error: 'Error finding solves',
    });
  }
});
