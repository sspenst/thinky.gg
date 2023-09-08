import { Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';
import { enrichLevels, getEnrichLevelsPipelineSteps } from '../../../helpers/enrich';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Level, { EnrichedLevel } from '../../../models/db/level';
import User from '../../../models/db/user';
import { KeyValueModel, LevelModel, UserModel } from '../../../models/mongoose';
import { LEVEL_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';

export const KV_LEVEL_OF_DAY_KEY_PREFIX = 'level-of-day-';
export const KV_LEVEL_OF_DAY_LIST = KV_LEVEL_OF_DAY_KEY_PREFIX + 'list';

export function getLevelOfDayKVKey() {
  return KV_LEVEL_OF_DAY_KEY_PREFIX + new Date(TimerUtil.getTs() * 1000).toISOString().slice(0, 10);
}

export async function getLevelOfDay(reqUser?: User | null) {
  await dbConnect();

  const key = getLevelOfDayKVKey();
  const levelKV = await KeyValueModel.findOne({ key: key }, {}, { lean: true });

  if (levelKV) {
    const levelAgg = await LevelModel.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(levelKV.value),
        }
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
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          ...LEVEL_DEFAULT_PROJECTION
        }
      },
      ...getEnrichLevelsPipelineSteps(reqUser, '_id', '')
    ]);

    if (levelAgg && levelAgg.length > 0) {
      return levelAgg[0] as EnrichedLevel;
    } else {
      logger.error(`Level of the day ${levelKV.value} not found. Could it have been deleted?`);

      return null;
    }
  }

  const previouslySelected = await KeyValueModel.findOne({ key: KV_LEVEL_OF_DAY_LIST }, {}, { lean: true });
  // generate a new level based on criteria...
  const MIN_STEPS = 12;
  const MAX_STEPS = 100;
  const MIN_REVIEWS = 3;
  const MIN_LAPLACE = 0.66;
  const levels = await LevelModel.find<Level>({
    isDeleted: { $ne: true },
    isDraft: false,
    leastMoves: {
      // least moves between 10 and 100
      $gte: MIN_STEPS,
      $lte: MAX_STEPS,
    },
    calc_difficulty_estimate: { $gte: 0, $exists: true },
    calc_reviews_count: {
      // at least 3 reviews
      $gte: MIN_REVIEWS,
    },
    calc_reviews_score_laplace: {
      $gte: MIN_LAPLACE,
    },
    _id: {
      $nin: previouslySelected?.value || [],
    },
  }, '_id name slug width height data leastMoves calc_difficulty_estimate', {
    lean: true,
    // sort by calculated difficulty estimate and then by id
    sort: {
      calc_difficulty_estimate: 1,
      _id: 1,
    },
  });

  let genLevel = levels[0];

  const todaysDayOfWeek = new Date(TimerUtil.getTs() * 1000).getUTCDay();
  const dayOfWeekDifficultyMap = [
    40, // sunday
    80, // monday
    100, // tuesday
    120, // wednesday
    140, // thursday
    250, // friday
    300, // saturday
  ];

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];

    if (level.calc_difficulty_estimate > dayOfWeekDifficultyMap[todaysDayOfWeek]) {
      genLevel = levels[i];
      break;
    }
  }

  if (!genLevel) {
    logger.error('Could not generate a new level of the day as there are no candidates left to choose from');

    return null;
  }

  // Create a new mongodb transaction and update levels-of-the-day value and also add another key value for this level
  const session = await KeyValueModel.startSession();

  try {
    await session.withTransaction(async () => {
      previouslySelected?.value?.push(genLevel._id);
      await KeyValueModel.updateOne({ key: 'level-of-day-list' }, {
        $set: {
          value: previouslySelected?.value || [genLevel._id],
        }
      }, { session: session, upsert: true });

      await KeyValueModel.updateOne({ key: key }, {
        $set: { value: new Types.ObjectId(genLevel._id) } }, { session: session, upsert: true });
    });
    session.endSession();
  } catch (err) {
    logger.error(err);
    session.endSession();

    return null;
  }

  const enriched = await enrichLevels([genLevel], reqUser || null);

  return enriched[0];
}

export default apiWrapper({
  GET: {},
}, async (req: NextApiRequest, res: NextApiResponse) => {
  const token = req.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;
  // Then query the database for the official level of the day collection
  const levelOfDay = await getLevelOfDay(reqUser);

  if (!levelOfDay) {
    return res.status(500).json({
      error: 'Error getting level of the day',
    });
  }

  return res.status(200).json(levelOfDay);
});
