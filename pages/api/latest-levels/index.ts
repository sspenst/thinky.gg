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

  // First get all recent levels
  const query = await doQuery(gameId, {
    disableCount: 'true',
    minRating: '0.5',
    maxRating: '1.0',
    numResults: '50', // Get more results to handle author limiting
    sortBy: 'ts',
    sortDir: 'desc',
    statFilter: StatFilter.HideSolved,
    timeRange: TimeRange[TimeRange.All],
  }, reqUser);

  const levels = query?.levels || [];

  // Apply author limit manually as a post-processing step
  if (levels.length > 0) {
    const authorCounts = new Map<string, number>();
    const maxPerAuthor = 3;
    const limitedLevels = [];

    // Process levels in their current sorted order
    for (const level of levels) {
      const authorId = level.userId._id.toString();
      const currentCount = authorCounts.get(authorId) || 0;

      // Only include levels if author is under limit
      if (currentCount < maxPerAuthor) {
        limitedLevels.push(level);
        authorCounts.set(authorId, currentCount + 1);
      }

      // Stop once we have 15 levels
      if (limitedLevels.length >= 15) {
        break;
      }
    }

    return limitedLevels;
  }

  return levels.slice(0, 15); // Fallback to just returning first 15
}
