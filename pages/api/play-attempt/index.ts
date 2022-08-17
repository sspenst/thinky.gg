import { ObjectId } from 'bson';
import { NextApiResponse } from 'next';
import getTs from '../../../helpers/getTs';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { LevelModel, PlayAttemptModel, StatModel } from '../../../models/mongoose';
import { AttemptContext } from '../../../models/schemas/playAttemptSchema';

const MINUTE = 60;

export async function forceUpdateLatestPlayAttempt(userId: string, levelId: string, context: AttemptContext, ts: number, opts: any) {
  const found = await PlayAttemptModel.findOneAndUpdate({
    userId: userId,
    levelId: levelId,
  }, {
    $set: {
      attemptContext: context,
      endTime: ts,
    },
    $inc: { updateCount: 1 }
  }, {
    new: false,
    sort: { _id: -1 },
    lean: true,
  });

  let sumAdd = 0;

  if (found && context !== AttemptContext.BEATEN) {
    sumAdd = ts - found.endTime;
  }

  if (sumAdd || context === AttemptContext.JUST_BEATEN) {
    await LevelModel.findByIdAndUpdate(levelId, {
      $inc: {
        calc_playattempts_duration_sum: sumAdd,
        calc_playattempts_just_beaten_count: context === AttemptContext.JUST_BEATEN ? 1 : 0,
      },
      $addToSet: {
        calc_playattempts_unique_users: new ObjectId(userId),
      }
    }, { new: true, ...opts });
  }

  if (!found) {
    // create one if it did not exist... rare but technically possible
    await PlayAttemptModel.create({
      _id: new ObjectId(),
      attemptContext: context,
      startTime: ts,
      endTime: ts,
      updateCount: 0,
      levelId: new ObjectId(levelId),
      userId: new ObjectId(userId),
    });

    await LevelModel.findByIdAndUpdate(levelId, {
      $inc: {
        calc_playattempts_count: 1,
      },
    }, { lean: true, ...opts });
  }
}

// This API extends an existing playAttempt, or creates a new one if the last
// playAttempt was over 15 minutes ago.
export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  if (!req.body) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  const { levelId } = req.body;

  if (!levelId) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  await dbConnect();
  const now = getTs();
  // first don't do anything if user has already beaten this level
  const [level, playAttempt, statRecord] = await Promise.all([
    LevelModel.findById(levelId),
    PlayAttemptModel.findOneAndUpdate({
      userId: req.user._id,
      levelId: levelId,
      endTime: { $gt: now - 15 * MINUTE },
      attemptContext: {
        $ne: AttemptContext.JUST_BEATEN
      }
    }, {
      $set: {
        endTime: now,
      },
      $inc: { updateCount: 1 }
    }, {
      new: false,
      sort: { _id: -1 },
      lean: true,
    }),
    StatModel.findOne({
      userId: req.user._id,
      levelId: levelId,
    }),
  ]);

  if (!level || level.isDraft) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  if (playAttempt) {
    // increment the level's calc_playattempts_duration_sum
    if (playAttempt.attemptContext !== AttemptContext.BEATEN) {
      await LevelModel.findByIdAndUpdate(levelId, {
        $inc: {
          calc_playattempts_duration_sum: now - playAttempt.endTime,
        },
        $addToSet: {
          calc_playattempts_unique_users: req.user._id,
        }
      });
    }

    return res.status(200).json({
      message: 'updated',
      playAttempt: playAttempt._id,
    });
  }

  const resp = await PlayAttemptModel.create({
    _id: new ObjectId(),
    userId: req.user._id,
    levelId: levelId,
    startTime: now,
    endTime: now,
    updateCount: 0,
    attemptContext: statRecord?.complete ? AttemptContext.BEATEN : AttemptContext.UNBEATEN,
  });

  // if it has been more than 15 minutes OR if we have no play attempt record create a new play attempt
  // increment the level's calc_playattempts_count
  let incr = {};

  if (!statRecord?.complete) {
    incr = { $inc: {
      calc_playattempts_count: 1,
    } };
  }

  await LevelModel.findByIdAndUpdate(levelId, {
    $addToSet: {
      calc_playattempts_unique_users: req.user._id,
    }, ...incr
  });

  return res.status(200).json({
    message: 'created',
    playAttempt: resp._id,
  });
});
