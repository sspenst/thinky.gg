import { PipelineStage } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../../helpers/apiWrapper';
import { getEnrichLevelsPieplineSteps } from '../../../../helpers/enrich';
import { logger } from '../../../../helpers/logger';
import cleanUser from '../../../../lib/cleanUser';
import dbConnect from '../../../../lib/dbConnect';
import { getUserFromToken } from '../../../../lib/withAuth';
import User from '../../../../models/db/user';
import { LevelModel } from '../../../../models/mongoose';
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
    const lookupPipelineUser: PipelineStage[] = getEnrichLevelsPieplineSteps(reqUser, '_id', '');

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
          },
        },
        {
          $unwind: '$userId',
        },

        {
          $project: {
            _id: 1,
            calc_playattempt_count: 1,
            calc_playattempts_duration_sum: 1,
            calc_playattempt_count_unbeaten: 1,
            calc_playattempts_just_beaten_count: 1,
            calc_playattempts_unique_users_sum: {
              $size: {
                $ifNull: ['$calc_playattempts_unique_users', []]
              }
            },
            calc_reviews_count: 1,
            calc_reviews_score_avg: 1,
            calc_reviews_score_laplace: 1,
            calc_stats_players_beaten: 1,
            data: 1,
            height: 1,
            width: 1,
            leastMoves: 1,
            name: 1,
            slug: 1,
            ts: 1,
            userId: {
              _id: '$userId._id',
              name: '$userId.name',
              last_visted_at: '$userId.last_visted_at',
              hideStatus: '$userId.hideStatus',
            },
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
