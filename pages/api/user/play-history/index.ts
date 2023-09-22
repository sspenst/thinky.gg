import { ValidDate, ValidEnum, ValidNumber, ValidObjectId } from '@root/helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps } from '@root/helpers/enrich';
import isPro from '@root/helpers/isPro';
import withAuth from '@root/lib/withAuth';
import User from '@root/models/db/user';
import { PlayAttemptModel } from '@root/models/mongoose';
import { LEVEL_DEFAULT_PROJECTION } from '@root/models/schemas/levelSchema';
import { AttemptContext } from '@root/models/schemas/playAttemptSchema';
import { PipelineStage, Types } from 'mongoose';

interface GetPlayAttemptsParams {
  userId: Types.ObjectId;
  cursor?: Types.ObjectId;
  datetime?: Date;
  minDurationMinutes?: number;
  filterWon?: boolean;
}

async function GetPlayAttempts(reqUser: User, params: GetPlayAttemptsParams) {
  const { userId, cursor, datetime, minDurationMinutes, filterWon } = params;
  const datetimeInSeconds = datetime ? Math.floor(datetime.getTime() / 1000) : undefined;

  const minDurationInSeconds = minDurationMinutes ? minDurationMinutes * 60 : undefined;

  const pipeline = [
    {
      $match: {
        userId: userId,
        ...(cursor && { _id: { $lt: cursor } }),
        ...(datetimeInSeconds && { endTime: { $lte: datetimeInSeconds } }),
        ...(filterWon && { attemptContext: AttemptContext.JUST_BEATEN }),
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
      },
    },
    {
      $limit: 10,
    },
    {
      $lookup: {
        from: 'levels',
        localField: 'levelId',
        foreignField: '_id',
        as: 'levelId',
        pipeline: [
          {
            $project: LEVEL_DEFAULT_PROJECTION,
          },
          ...getEnrichLevelsPipelineSteps(reqUser, '_id', ''),
        ],
      },
    },
    {
      $unwind: {
        path: '$levelId',
      },
    },

  ];

  return PlayAttemptModel.aggregate(pipeline as PipelineStage[]);
}

export default withAuth({
  GET: {
    query: {
      datetime: ValidDate(false),
      minDurationMinutes: ValidNumber(false, 0, 60 * 24),
      filterWon: ValidEnum(['true', 'false'], false),
      cursor: ValidObjectId(false)
    }
  }
}, async (req, res) => {
  if (isPro(req.user) === false) {
    return res.status(403).json({
      error: 'You must be a pro user to access this endpoint.',
    });
  }

  const { datetime, minDurationMinutes, cursor, filterWon } = req.query;

  const playAttempts = await GetPlayAttempts(req.user,
    {
      userId: req.user._id,
      cursor: new Types.ObjectId(cursor as string),
      datetime: datetime ? new Date(datetime as string) : undefined,
      minDurationMinutes: minDurationMinutes ? parseInt(minDurationMinutes as string) : undefined,
      filterWon: filterWon === 'true'
    }
  );

  return res.status(200).json(playAttempts);
});
