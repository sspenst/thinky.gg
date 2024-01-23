import { GameId } from '@root/constants/GameId';
import StatFilter from '@root/constants/statFilter';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import type { NextApiRequest, NextApiResponse } from 'next';
import TimeRange from '../../../constants/timeRange';
import apiWrapper from '../../../helpers/apiWrapper';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import User from '../../../models/db/user';
import { doQuery } from '../search';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const token = req.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const gameId = getGameIdFromReq(req);
  const levels = await getLatestLevels(gameId, reqUser);

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels',
    });
  }

  return res.status(200).json(levels);
});

export async function getLatestLevels(gameId: GameId, reqUser: User | null = null) {
  await dbConnect();
  const query = await doQuery(gameId, {
    disableCount: 'true',
    minRating: '0.5',
    maxRating: '1.0',
    numResults: '15',
    sortBy: 'ts',
    sortDir: 'desc',
    statFilter: StatFilter.HideSolved,
    timeRange: TimeRange[TimeRange.All],
  }, reqUser);

  return query?.levels;
}
