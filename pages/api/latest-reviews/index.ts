import { GameId } from '@root/constants/GameId';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { PipelineStage } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps } from '../../../helpers/enrich';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Review from '../../../models/db/review';
import User from '../../../models/db/user';
import { LevelModel, ReviewModel, UserModel } from '../../../models/mongoose';
import { LEVEL_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const token = req.cookies?.token;
  const gameId = getGameIdFromReq(req);
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const reviews = await getLatestReviews(gameId, reqUser);

  if (!reviews) {
    return res.status(500).json({
      error: 'Error finding Reviews',
    });
  }

  return res.status(200).json(reviews);
});

export async function getLatestReviews(gameId: GameId, reqUser: User | null = null) {
  await dbConnect();
  const lookupPipelineUser: PipelineStage[] = getEnrichLevelsPipelineSteps(reqUser, '_id', '');

  try {
    const reviews = await ReviewModel.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          text: { $exists: true },
          gameId: gameId
        }
      },
      {
        $sort: {
          ts: -1,
        }
      },
      {
        $lookup: {
          from: LevelModel.collection.name,
          localField: 'levelId',
          foreignField: '_id',
          as: 'levelId',
          pipeline: [
            { $match: { isDeleted: { $ne: true } } },
            {
              $project: {
                ...LEVEL_DEFAULT_PROJECTION
              }
            },
            ...lookupPipelineUser as PipelineStage.Lookup[],
          ]
        }
      },
      {
        $unwind: '$levelId',
      },
      {
        $limit: 7,
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
        }
      },
      {
        $unwind: {
          path: '$userId',
          preserveNullAndEmptyArrays: true,
        }
      },

    ]);

    if (!reviews || reviews.length === 0) {
      return null;
    }

    return reviews.map(review => {
      cleanUser(review.userId);

      return review;
    }) as Review[];
  } catch (err) {
    logger.error(err);

    return null;
  }
}
