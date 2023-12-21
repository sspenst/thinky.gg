import { GameId } from '@root/constants/GameId';
import { postPlayAttempt } from '@root/helpers/play-attempts/postPlayAttempt';
import { ObjectId } from 'mongoose';
import { NextApiResponse } from 'next';
import { ValidEnum, ValidObjectId } from '../../../helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { EnrichedLevel } from '../../../models/db/level';
import User from '../../../models/db/user';
import { getPlayAttempts } from '../user/play-history';

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

    return res.status(resTrack.status).json(resTrack.json);
  }
});
