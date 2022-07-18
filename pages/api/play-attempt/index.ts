import { LevelModel, PlayAttemptModel, StatModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import PlayAttempt from '../../../models/schemas/playAttemptSchema';
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

  // first don't do anything if user has already beaten this level
  const [level, playAttempt, statRecord] = await Promise.all([
    LevelModel.findById(levelId),
    PlayAttemptModel.findOne({
      userId: req.user._id,
      levelId: levelId,
    }, {}, {
      sort: { endTime: -1 }
    }),
    StatModel.findOne({
      userId: req.user._id,
      levelId: levelId,
    }),
  ]);

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  const now = getTs();

  if (playAttempt) {
    if (statRecord?.complete) {
      return res.status(412).json({
        error: 'Already beaten',
      // 412 to tell the app to stop sending requests to this endpoint. Technically there is an edge case where if someone has the level already open and have already beaten the level and while it is open another player beats the record, there current play wouldnt be logged.
      });
    }

    // Check if the endtime is within 15 minutes of now, if so update it to current time

    const endTime = playAttempt.endTime;
    const timeDiff = now - endTime;

    console.log(now, endTime, timeDiff / 60);

    if (timeDiff < 15 * MINUTE) {
      playAttempt.endTime = now;
      playAttempt.save();

      return res.status(200).json({
        message: 'updated',
        playAttempt: playAttempt._id,
      });
    }
  }

  // if it has been more than 15 minutes OR if we have no play attempt record create a new play attempt

  const resp = await PlayAttemptModel.create({
    _id: new ObjectId(),
    userId: req.user._id,
    levelId: levelId,
    startTime: now,
    endTime: now,
  });

  return res.status(200).json({
    message: 'created',
    playAttempt: resp._id,
  });

});
