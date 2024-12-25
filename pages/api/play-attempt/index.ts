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

    const resTrack = await postPlayAttempt(req.user._id, levelId);

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    if (!req.user.config?.lastPlayedAt || new Date(req.user.config.lastPlayedAt).getTime() < new Date().getTime() - ONE_DAY_MS) {
      // should only run if the user has not played in the last day... so we can update the streak
      const { currentStreak, calendar } = await getStreaks(req.user._id, req.gameId);
      if (calendar.length > 0) {
        await Promise.all([
          UserConfigModel.updateOne({ userId: new Types.ObjectId(req.user._id), gameId: req.gameId }, {
            $set: {
            calcCurrentStreak: currentStreak,
            lastPlayedAt: new Date(calendar[0].date).getTime(),
          },
        }),
          requestBroadcastAlert(new Types.ObjectId(req.user._id), AlertType.STREAK, { streak: currentStreak }),
        ]);
      }
    }

    return res.status(resTrack.status).json(resTrack.json);
  }
});
