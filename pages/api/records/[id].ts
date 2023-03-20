import { Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import { RecordModel } from '../../../models/mongoose';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';

export default apiWrapper({ GET: {
  query: {
    id: ValidObjectId(),
  },
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  await dbConnect();

  try {
    const records = await RecordModel.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          levelId: new Types.ObjectId(id as string),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
          pipeline: [
            {
              $project: {
                ...USER_DEFAULT_PROJECTION
              }
            }
          ],
        }
      },
      {
        $unwind: '$userId',
      },
      {
        $sort: {
          moves: 1,
        },
      },
    ]);

    if (!records) {
      return res.status(404).json({
        error: 'Error finding Records',
      });
    }

    records.forEach(record => cleanUser(record.userId));

    return res.status(200).json(records);
  } catch (e) {
    logger.error(e);

    return res.status(500).json({
      error: 'Error finding Records',
    });
  }
});
