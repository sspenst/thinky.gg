import { LevelModel, PlayAttemptModel, StatModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import dbConnect from '../../../lib/dbConnect';
import getTs from '../../../helpers/getTs';

const MINUTE = 60;

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
    }, {
      $set: {
        endTime: now,
      },
      $inc: { updateCount: 1 }
    }, {
      new: false,
      sort: { _id: -1 }
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
    if (playAttempt.attemptContext !== 2) {
      await LevelModel.findByIdAndUpdate(levelId, {
        $inc: {
          calc_playattempts_duration_sum: now - playAttempt.endTime,
        },
      });
    }

    return res.status(200).json({
      message: 'updated',
      playAttempt: playAttempt._id,
    });
  }

  // if it has been more than 15 minutes OR if we have no play attempt record create a new play attempt
  // increment the level's calc_playattempts_duration_sum
  if (!statRecord?.complete) {
    await LevelModel.findByIdAndUpdate(levelId, {
      $inc: {
        calc_playattempts_count: 1,
      },
    });
  }

  const resp = await PlayAttemptModel.create({
    _id: new ObjectId(),
    userId: req.user._id,
    levelId: levelId,
    startTime: now,
    endTime: now,
    updateCount: 0,
    attemptContext: statRecord?.complete ? 2 : 0,
  });

  return res.status(200).json({
    message: 'created',
    playAttempt: resp._id,
  });
});
