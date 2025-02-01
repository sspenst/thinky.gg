import { GameId } from '@root/constants/GameId';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { LEVEL_DEFAULT_PROJECTION, USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { PipelineStage } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps, getEnrichUserConfigPipelineStage } from '../../../../helpers/enrich';
import { logger } from '../../../../helpers/logger';
import cleanUser from '../../../../lib/cleanUser';
import dbConnect from '../../../../lib/dbConnect';
import { getUserFromToken } from '../../../../lib/withAuth';
import Level, { EnrichedLevel } from '../../../../models/db/level';
import User from '../../../../models/db/user';
import { LevelModel, UserModel } from '../../../../models/mongoose';
import { LevelUrlQueryParams } from '../../../[subdomain]/level/[username]/[slugName]';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { slugName, username } = req.query as LevelUrlQueryParams;
  const token = req.cookies?.token;
  const gameId = getGameIdFromReq(req);
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const level = await getLevelByUrlPath(gameId, username, slugName, reqUser);

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  return res.status(200).json(level);
});

export async function getLevelByUrlPath(gameId: GameId, username: string, slugName: string, reqUser: User | null) {
  await dbConnect();

  try {
    const lookupPipelineUser: PipelineStage[] = getEnrichLevelsPipelineSteps(reqUser);

    const levelAgg = await LevelModel.aggregate<Level>(
      [
        {
          $match: {
            slug: username + '/' + slugName,
            isDeleted: { $ne: true },
            isDraft: false,
            gameId: gameId
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
            ]
          },
        },
        {
          $unwind: '$userId',
        },
        ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'userId._id', lookupAs: 'userId.config' }),
        {
          $lookup: {
            from: UserModel.collection.name,
            localField: 'archivedBy',
            foreignField: '_id',
            as: 'archivedBy',
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
          $unwind: {
            path: '$archivedBy',
            preserveNullAndEmptyArrays: true,
          }
        },
        ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'archivedBy._id', lookupAs: 'archivedBy.config' }),
        {
          $project: {
            ...LEVEL_DEFAULT_PROJECTION,
            archivedBy: 1,
            archivedTs: 1,
            authorNote: 1,
            calc_playattempts_just_beaten_count: 1,
            calc_reviews_count: 1,
            calc_reviews_score_laplace: 1,
            ts: 1,
          }
        },
        ...lookupPipelineUser
      ] as PipelineStage[]);

    if (levelAgg.length === 0) {
      return null;
    }

    const level = levelAgg[0] as EnrichedLevel;

    cleanUser(level.userId);
    cleanUser(level.archivedBy);

    return level;
  } catch (err) /* istanbul ignore next */ {
    logger.error(err);

    return null;
  }
}
