import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import { RecordModel, UserModel } from '../../../models/mongoose';

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
          from: UserModel.collection.name,
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
        $unwind: {
          path: '$userId',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          moves: 1,
        },
      },
      ...getEnrichUserConfigPipelineStage('$gameId', { excludeCalcs: true, localField: 'userId._id', lookupAs: 'userId.config' }),
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
