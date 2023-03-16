import type { NextApiRequest, NextApiResponse } from 'next';
import TimeRange from '../../../constants/timeRange';
import apiWrapper from '../../../helpers/apiWrapper';
import { FilterSelectOption } from '../../../helpers/filterSelectOptions';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import User from '../../../models/db/user';
import { LEVEL_SEARCH_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import { doQuery } from '../search';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const token = req.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const levels = await getLatestLevels(reqUser);

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels',
    });
  }

  return res.status(200).json(levels);
});

export async function getLatestLevels(reqUser: User | null = null) {
  await dbConnect();

  const query = await doQuery({
    min_rating: '0.5',
    max_rating: '1.0',
    num_results: '15',
    sort_by: 'ts',
    sort_dir: 'desc',
    show_filter: FilterSelectOption.HideWon,
    time_range: TimeRange[TimeRange.All]
  }, reqUser?._id, {
    ...LEVEL_SEARCH_DEFAULT_PROJECTION,
    width: 1,
    height: 1,
    data: 1,
  });

  return query?.levels;
}
