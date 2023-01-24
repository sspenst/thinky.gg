import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps } from '../../../helpers/enrich';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import { EnrichedLevel } from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel } from '../../../models/mongoose';
import { LEVEL_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const token = req.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const levels = await getLatestLevels(reqUser);

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels',
    });
  }

  return res.status(200).json(levels);
});

export async function getLatestLevels(reqUser: User | null = null) {
  await dbConnect();

  try {
    const enrichPipeline = getEnrichLevelsPipelineSteps(reqUser, '_id', '');
    const levelsAgg = await LevelModel.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          isDraft: false,
        }
      },
      {
        $sort: {
          ts: -1,
        }
      },
      {
        $limit: 24,
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
          ]
        }
      },
      {
        $unwind: {
          path: '$userId',
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $project: {
          ...LEVEL_DEFAULT_PROJECTION,
        },
      },
      ...enrichPipeline
    ]);

    return levelsAgg as EnrichedLevel[];
  } catch (err) {
    logger.error(err);

    return null;
  }
}
