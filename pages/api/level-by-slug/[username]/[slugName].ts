import { PipelineStage } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps } from '../../../../helpers/enrich';
import { logger } from '../../../../helpers/logger';
import cleanUser from '../../../../lib/cleanUser';
import dbConnect from '../../../../lib/dbConnect';
import { getUserFromToken } from '../../../../lib/withAuth';
import User from '../../../../models/db/user';
import { LevelModel } from '../../../../models/mongoose';
import { LEVEL_DEFAULT_PROJECTION } from '../../../../models/schemas/levelSchema';
import { USER_DEFAULT_PROJECTION } from '../../../../models/schemas/userSchema';
import { LevelUrlQueryParams } from '../../../level/[username]/[slugName]';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { slugName, username } = req.query as LevelUrlQueryParams;
  const token = req.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const level = await getLevelByUrlPath(username, slugName, reqUser);

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  return res.status(200).json(level);
});

export async function getLevelByUrlPath(username: string, slugName: string, reqUser: User | null) {
  await dbConnect();

  try {
    const lookupPipelineUser: PipelineStage[] = getEnrichLevelsPipelineSteps(reqUser, '_id', '');

    const levelAgg = await LevelModel.aggregate(
      ([
        {
          $match: {
            slug: username + '/' + slugName,
            isDraft: false
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
            ]
          },
        },
        {
          $unwind: '$userId',
        },
        {
          $project: {
            ...LEVEL_DEFAULT_PROJECTION,
            ts: 1,
            authorNote: 1,
            calc_difficulty_estimate: 1
          }
        },
        ...lookupPipelineUser
      ] as PipelineStage[]));

    if (levelAgg.length === 0) {
      return null;
    }

    cleanUser(levelAgg[0].userId);

    return levelAgg[0];
  } catch (err) /* istanbul ignore next */ {
    logger.error(err);

    return null;
  }
}
