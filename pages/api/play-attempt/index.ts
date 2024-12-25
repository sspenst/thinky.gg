import { GameId } from '@root/constants/GameId';
import { postPlayAttempt } from '@root/helpers/play-attempts/postPlayAttempt';
import { NextApiResponse } from 'next';
import { ValidEnum, ValidObjectId } from '../../../helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { EnrichedLevel } from '../../../models/db/level';
import User from '../../../models/db/user';
import { getPlayAttempts } from '../user/play-history';
import AlertType from '@root/constants/alertType';
import { requestBroadcastAlert } from '@root/lib/appSocketToClient';
import { Types } from 'mongoose';
import { UserConfigModel } from '@root/models/mongoose';
import { getStreaks } from '../streak';

export async function getLastLevelPlayed(gameId: GameId, user: User) {
  const playAttempts = await getPlayAttempts(gameId, user, {}, 1);

  if (playAttempts.length === 0) {
    return null;
  }

  return playAttempts[0].levelId as EnrichedLevel;
}

// This API extends an existing playAttempt, or creates a new one if the last
// playAttempt was over 15 minutes ago.
export default withAuth({
  GET: {
    query: {
      context: ValidEnum(['recent_unsolved']),
    },
  },
  POST: {
    body: {
      levelId: ValidObjectId(),
    },
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const lastPlayed = await getLastLevelPlayed(req.gameId, req.user);

    return res.status(200).json(lastPlayed);
  } else if (req.method === 'POST') {

    const { levelId } = req.body;
    const now = new Date();
    const today = new Date(now);
    const resTrack = await postPlayAttempt(req.user._id, levelId);
    if (resTrack.status !== 200) {
      return res.status(resTrack.status).json(resTrack.json);
    }

    if (resTrack.json?.message === 'updated') {
      // only update streak if the play attempt is a real play attempt
      today.setHours(0, 0, 0, 0);

      // If user hasn't played today yet
      const lastPlayedDate = req.user.config?.lastPlayedAt ? new Date(req.user.config.lastPlayedAt) : null;
      const lastPlayedDay = lastPlayedDate ? new Date(lastPlayedDate.setHours(0, 0, 0, 0)) : null;

      if (!lastPlayedDay || lastPlayedDay.getTime() < today.getTime()) {
        // Update streak since this is first play of the day
        const { currentStreak, calendar } = await getStreaks(req.user._id, req.gameId);

        if (calendar.length > 0 && currentStreak !== req.user.config?.calcCurrentStreak) {
          await Promise.all([
            UserConfigModel.updateOne(
              { userId: new Types.ObjectId(req.user._id), gameId: req.gameId },
              {
                $set: {
                  calcCurrentStreak: currentStreak + 1,
                  lastPlayedAt: now.getTime(), // Store the actual timestamp, not midnight
                },
              }
            ),
            requestBroadcastAlert(new Types.ObjectId(req.user._id), AlertType.STREAK, { streak: currentStreak }),
          ]);
        }
      }
    }

    return res.status(resTrack.status).json(resTrack.json);
  }
});
