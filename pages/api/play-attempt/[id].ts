import { LevelModel, PlayAttemptModel, StatModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';

import { NextApiResponse } from 'next';
import PlayAttempt from '../../../models/schemas/playAttemptSchema';
import dbConnect from '../../../lib/dbConnect';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
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
  const [playAttempt] = await Promise.all([
    PlayAttemptModel.findOne({
      userId: req.user._id,
      levelId: levelId,
    }, {
      sort: { endTime: -1 }
    })
  ]);

  if (playAttempt.didWin) {
    return res.status(412).json({
      error: 'You have already beaten this level',
      // 412 to tell the app to stop sending requests to this endpoint. Technically there is an edge case where if someone has the level already open and have already beaten the level and while it is open another player beats the record, there current play wouldnt be logged.
    });
  }

  // Check if the endtime is within 15 minutes of now, if so update it to current time
  const now = new Date().getTime();
  const endTime = playAttempt.endTime;
  const timeDiff = now - endTime;
  const diffMinutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

  if (diffMinutes < 15) {
    playAttempt.endTime = now;
    playAttempt.save();

    return res.status(200).json({
      message: 'updated',
      playAttempt: playAttempt,
    });
  }
  else {
    // if not, create a new play attempt
    const newPlayAttempt = new PlayAttemptModel({
      userId: req.user._id,
      levelId: levelId,
      startTime: now,
      endTime: now,
      didWin: false,
    });

    await newPlayAttempt.save();

    return res.status(200).json({
      message: 'created',
      playAttempt: newPlayAttempt,
    });
  }
});
