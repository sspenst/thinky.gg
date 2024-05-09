import { GameId } from '@root/constants/GameId';
import { GameType } from '@root/constants/Games';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import cleanUser from '@root/lib/cleanUser';
import { LEVEL_DEFAULT_PROJECTION, USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import KeyValue from '@root/models/db/keyValue';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';
import apiWrapper, { NextApiRequestWrapper } from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps, getEnrichUserConfigPipelineStage } from '../../../helpers/enrich';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Level, { EnrichedLevel } from '../../../models/db/level';
import User from '../../../models/db/user';
import { KeyValueModel, LevelModel, UserModel } from '../../../models/mongoose';

export const KV_LEVEL_OF_DAY_KEY_PREFIX = 'level-of-day-';
export const KV_LEVEL_OF_DAY_LIST = KV_LEVEL_OF_DAY_KEY_PREFIX + 'list';

export function getLevelOfDayKVKey() {
  return KV_LEVEL_OF_DAY_KEY_PREFIX + new Date(TimerUtil.getTs() * 1000).toISOString().slice(0, 10);
}

async function getNewLevelOfDay(key: string, gameId: GameId) {
  const game = getGameFromId(gameId);
  const difficultyEstimate = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_completion_estimate' : 'calc_difficulty_estimate';
  const previouslySelected = await KeyValueModel.findOne({ key: KV_LEVEL_OF_DAY_LIST, gameId: gameId }).lean<KeyValue>();

  const MIN_STEPS = 12;
  const MAX_STEPS = 100;
  const MIN_REVIEWS = 3;
  const MIN_LAPLACE = 0.66;

  const levels = await LevelModel.find<Level>({
    isDeleted: { $ne: true },
    isDraft: false,
    gameId: gameId,
    leastMoves: {
      $gte: MIN_STEPS,
      $lte: MAX_STEPS,
    },
    [difficultyEstimate]: { $gte: 0, $exists: true },
    calc_reviews_count: {
      $gte: MIN_REVIEWS,
    },
    calc_reviews_score_laplace: {
      $gte: MIN_LAPLACE,
    },
    _id: {
      $nin: previouslySelected?.value || [],
    },
  }, '_id calc_difficulty_estimate calc_difficulty_completion_estimate', {
    sort: {
      [difficultyEstimate]: 1,
      _id: 1,
    },
  }).lean<Level[]>();

  const todaysDayOfWeek = new Date(TimerUtil.getTs() * 1000).getUTCDay();
  const dayOfWeekDifficultyMap = [
    40, // sunday
    115, // monday
    150, // tuesday
    250, // wednesday
    300, // thursday
    500, // friday
    600, // saturday
  ];
  let newLevelId: Types.ObjectId | null = null;

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];

    if (level[difficultyEstimate] > dayOfWeekDifficultyMap[todaysDayOfWeek]) {
      newLevelId = level._id;
      break;
    }
  }

  if (!newLevelId) {
    logger.error(`Could not generate a new level of the day for ${gameId} as there are no candidates left to choose from`);

    // choose the last level published as the level of the day as a backup
    const latestLevel = await LevelModel.findOne<Level>({
      isDeleted: { $ne: true },
      isDraft: false,
      gameId: gameId,
      _id: {
        $nin: previouslySelected?.value || [],
      },
    }, '_id', {
      sort: {
        _id: -1,
      },
    }).lean<Level>();

    if (!latestLevel) {
      logger.error(`Could not find any level of the day for ${gameId}`);

      return null;
    }

    newLevelId = latestLevel._id;
  }

  const session = await KeyValueModel.startSession();

  try {
    await session.withTransaction(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (previouslySelected?.value as any)?.push(newLevelId);

      await KeyValueModel.updateOne({ key: KV_LEVEL_OF_DAY_LIST, gameId: gameId }, {
        $set: {
          gameId: gameId,
          value: previouslySelected?.value || [newLevelId],
        }
      }, { session: session, upsert: true });

      await KeyValueModel.updateOne({ key: key, gameId: gameId }, {
        $set: {
          gameId: gameId,
          value: newLevelId,
        } }, { session: session, upsert: true });
    });
    session.endSession();
  } catch (err) {
    logger.error(err);
    session.endSession();

    return null;
  }

  return newLevelId;
}

export async function getLevelOfDay(gameId: GameId, reqUser?: User | null) {
  await dbConnect();
  const key = getLevelOfDayKVKey();
  const levelKV = await KeyValueModel.findOne({ key: key, gameId: gameId }).lean<KeyValue>();
  let levelId: Types.ObjectId | null = null;

  if (!levelKV) {
    levelId = await getNewLevelOfDay(key, gameId);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    levelId = Types.ObjectId.isValid(levelKV.value as any as string) ? new Types.ObjectId(levelKV.value as any as string) : null;
  }

  if (!levelId) {
    logger.error(`Level of the day ${levelId} not found. Could it have been deleted?`);

    return null;
  }

  const levelAgg = await LevelModel.aggregate<EnrichedLevel>([
    {
      $match: {
        _id: levelId,
        gameId: gameId,
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
    ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'userId._id', lookupAs: 'userId.config' }),
    {
      $project: {
        ...LEVEL_DEFAULT_PROJECTION
      }
    },
    ...getEnrichLevelsPipelineSteps(reqUser),
  ]);

  if (!levelAgg || levelAgg.length === 0) {
    logger.error(`Level of the day ${levelId} not found`);

    return null;
  }

  cleanUser(levelAgg[0].userId);

  return levelAgg[0];
}

export default apiWrapper({
  GET: {},
}, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
  const token = req.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;

  if (req.gameId === GameId.THINKY) {
    // batch get all the levels of the day for all games
    const allGames = Object.values(GameId).filter(gameId => gameId !== GameId.THINKY);
    const promises = allGames.map(gameId => getLevelOfDay(gameId, reqUser));
    const levels = await Promise.all(promises);
    // make it a map with gameId as key
    const levelsMap = levels.reduce((acc, level) => {
      if (!level) {
        return acc;
      }

      acc[level.gameId] = level;

      return acc;
    }, {} as { [gameId: string]: EnrichedLevel | null });

    return res.status(200).json(levelsMap);
  }

  // Then query the database for the official level of the day collection
  const levelOfDay = await getLevelOfDay(req.gameId, reqUser);

  if (!levelOfDay) {
    return res.status(500).json({
      error: 'Error getting level of the day',
    });
  }

  return res.status(200).json(levelOfDay);
});
