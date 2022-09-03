import { ObjectId } from 'bson';
import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import { KeyValueModel, LevelModel } from '../../../models/mongoose';

export const KV_LEVEL_OF_DAY_KEY_PREFIX = 'level-of-the-day-';
export const KV_LEVEL_OF_DAY_LIST = KV_LEVEL_OF_DAY_KEY_PREFIX + 'list';

export function getLevelOfDayKVKey() {
  return KV_LEVEL_OF_DAY_KEY_PREFIX + new Date(TimerUtil.getTs() * 1000).toISOString().slice(0, 10);
}

export default apiWrapper({
  GET: {},
}, async (req: NextApiRequest, res: NextApiResponse) => {
  // Then query the database for the official level of the day collection
  const key = getLevelOfDayKVKey();

  const levelKV = await KeyValueModel.findOne({ key: key }, {}, { lean: true });

  if (levelKV) {
    const level = await LevelModel.findById(levelKV.value, {}, { lean: true });

    if (level) {
      return res.status(200).json(level);
    } else {
      logger.error(`Level of the day ${levelKV.value} not found. Could it have been deleted?`);

      return res.status(404).json({ error: 'Level of the day not found' });
    }
  }

  const previouslySelected = await KeyValueModel.findOne({ key: KV_LEVEL_OF_DAY_LIST }, {}, { lean: true });
  // generate a new level based on criteria...
  const MIN_STEPS = 12;
  const MAX_STEPS = 100;
  const MIN_REVIEWS = 3;
  const MIN_LAPLACE = 0.66;
  const levels = await LevelModel.find(
    {
      isDraft: false,
      leastMoves: {
        // least moves between 10 and 100
        $gte: MIN_STEPS,
        $lte: MAX_STEPS,
      },
      calc_reviews_count: {
        // at least 3 reviews
        $gte: MIN_REVIEWS,
      },
      calc_reviews_score_laplace: {
        $gte: MIN_LAPLACE,
      },
      'calc_playattempts_unique_users.10': {
        // the length of calc_playattempts_unique_users at least 10
        $exists: true,

      },
      _id: {
        $nin: previouslySelected?.value || [],
      }
    }, {
      '_id': 1,
      'name': 1,
      'slug': 1,
      'width': 1,
      'height': 1,
      'data': 1,
      'points': 1,
      //'calc_reviews_score_laplace': 1,
      //'calc_playattempts_duration_sum': 1,
      //'calc_stats_players_beaten': 1,
      /*'total_played': {
        $size: '$calc_playattempts_unique_users',
      },*/
      'totaltime_div_ppl_beat': {
        '$divide': [
          '$calc_playattempts_duration_sum', '$calc_stats_players_beaten'
        ]
      },
    }, { lean: true, sort: {
      'totaltime_div_ppl_beat': -1 // for some reason this isnt working
    } });

  // pick the level that is closest to totaltime_div_ppl_beat of 30
  const sortedLevels = levels.sort((a, b) => {
    return a.totaltime_div_ppl_beat - b.totaltime_div_ppl_beat;
  });

  let genLevel = sortedLevels[0];

  for (let i = 0; i < levels.length; i++) {
    const level = sortedLevels[i];

    if (level.totaltime_div_ppl_beat > 30) {
      genLevel = sortedLevels[i];
      break;
    }
  }

  // Create a new mongodb transaction and update levels-of-the-day value and also add another key value for this level
  const session = await KeyValueModel.startSession();

  try {
    await session.withTransaction(async () => {
      previouslySelected?.value?.push(genLevel._id);
      await KeyValueModel.updateOne({ key: 'level-of-the-day-list' }, {
        $set: {
          value: previouslySelected?.value || [genLevel._id],
        }
      }, { session: session, upsert: true });

      await KeyValueModel.updateOne({ key: key }, {
        $set: { value: new ObjectId(genLevel._id) } }, { session: session, upsert: true });
    });
  } catch (err) {
    logger.error(err);

    return res.status(500).json({
      error: 'Error getting level of the day',
    });
  }

  return res.status(200).json({ ...genLevel, totaltime_div_ppl_beat: undefined });
});
