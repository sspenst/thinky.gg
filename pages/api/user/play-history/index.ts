import { GameId } from '@root/constants/GameId';
import { ValidDate, ValidEnum, ValidNumber, ValidObjectId } from '@root/helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps, getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import isPro from '@root/helpers/isPro';
import withAuth from '@root/lib/withAuth';
import { LEVEL_DEFAULT_PROJECTION, USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import User from '@root/models/db/user';
import { LevelModel, PlayAttemptModel, UserModel } from '@root/models/mongoose';
import { AttemptContext } from '@root/models/schemas/playAttemptSchema';
import { PipelineStage, Types } from 'mongoose';

interface GetPlayAttemptsParams {
  cursor?: Types.ObjectId;
  datetime?: Date;
  filterSolved?: boolean;
  minDurationMinutes?: number;
}

export async function getPlayAttempts(gameId: GameId, reqUser: User, params: GetPlayAttemptsParams, limit = 10) {
  const { cursor, datetime, filterSolved, minDurationMinutes } = params;
  const datetimeInSeconds = datetime ? Math.floor(datetime.getTime() / 1000) : undefined;
  const minDurationInSeconds = minDurationMinutes ? minDurationMinutes * 60 : undefined;

  return await PlayAttemptModel.aggregate([
    {
      $match: {
        isDeleted: { $ne: true },
        userId: reqUser._id,
        gameId: gameId,
        ...(cursor && { _id: { $lt: cursor } }),
        ...(datetimeInSeconds && { endTime: { $lte: datetimeInSeconds } }),
        ...(filterSolved && { attemptContext: AttemptContext.JUST_SOLVED }),
      },
    },
    {
      $addFields: {
        duration: { $subtract: ['$endTime', '$startTime'] }
      }
    },
    {
      $match: {
        ...(minDurationInSeconds && { duration: { $gte: minDurationInSeconds } }),
      }
    },
    {
      $sort: {
        endTime: -1,
        // NB: if end time is identical, we want to get the highest attempt context (JUST_SOLVED over UNSOLVED)
        attemptContext: -1,
      },
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'levelId',
        foreignField: '_id',
        as: 'levelId',
        pipeline: [
          {
            $project: LEVEL_DEFAULT_PROJECTION,
          },
          ...getEnrichLevelsPipelineSteps(reqUser),
        ],
      },
    },
    {
      $unwind: {
        path: '$levelId',
      },
    },
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: 'levelId.userId',
        foreignField: '_id',
        as: 'levelId.userId',
        pipeline: [
          {
            $project: USER_DEFAULT_PROJECTION,
          },
        ],
      },
    },
    {
      $unwind: '$levelId.userId',
    },
    ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'levelId.userId._id', lookupAs: 'levelId.userId.config' }),
  ] as PipelineStage[]);
}

export default withAuth({
  GET: {
    query: {
      cursor: ValidObjectId(false),
      datetime: ValidDate(false),
      filterSolved: ValidEnum(['true', 'false'], false),
      minDurationMinutes: ValidNumber(false, 0, 60 * 24),
    }
  }
}, async (req, res) => {
  if (!isPro(req.user)) {
    return res.status(403).json({
      error: 'You must be a pro user to access this endpoint.',
    });
  }

  const { cursor, datetime, filterSolved, minDurationMinutes } = req.query;

  const playAttempts = await getPlayAttempts(req.gameId, req.user, {
    cursor: new Types.ObjectId(cursor as string),
    datetime: datetime ? new Date(datetime as string) : undefined,
    filterSolved: filterSolved === 'true',
    minDurationMinutes: minDurationMinutes ? parseInt(minDurationMinutes as string) : undefined,
  });

  return res.status(200).json(playAttempts);
});
