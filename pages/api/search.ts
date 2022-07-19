import { LevelModel, StatModel, UserModel } from '../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../lib/withAuth';
import Level from '../../models/db/level';
import type { NextApiResponse } from 'next';
import { SearchQuery } from '../search';
import TimeRange from '../../constants/timeRange';
import dbConnect from '../../lib/dbConnect';

export async function doQuery(query: SearchQuery, userId = '') {
  await dbConnect();

  const { block_filter, max_steps, min_steps, page, search, searchAuthor, show_filter, sort_by, sort_dir, time_range } = query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchObj = { 'isDraft': false } as { [key: string]: any };
  const limit = 20;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sortObj = { 'ts': 1 } as { [key: string]: any };

  if (search && search.length > 0) {
    // remove non-alphanumeric characters
    const searchStr = search.replace(/[^a-zA-Z0-9' ]/g, '');

    searchObj['name'] = {
      $regex: searchStr,
      $options: 'i',
    };
  }

  const userIdFilter = null;

  if (searchAuthor && searchAuthor.length > 0) {
    // remove non-alphanumeric characters
    const searchAuthorStr = searchAuthor.replace(/[^a-zA-Z0-9' ]/g, '');

    const user = await UserModel.findOne({ 'name': searchAuthorStr });

    if (user) {
      searchObj['userId'] = user._id;
    }
  }

  if (min_steps && max_steps) {
    searchObj['leastMoves'] = {
      $gte: parseInt(min_steps),
      $lte: parseInt(max_steps),
    };
  }

  if (time_range) {
    if (time_range === TimeRange[TimeRange.Day]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 24 * 60 * 60 * 1000).getTime() / 1000;
    }
    else if (time_range === TimeRange[TimeRange.Week]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime() / 1000;
    }
    else if (time_range === TimeRange[TimeRange.Month]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime() / 1000;
    }
    else if (time_range === TimeRange[TimeRange.Year]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).getTime() / 1000;
    }
  }

  const sort_direction = (sort_dir === 'asc') ? 1 : -1;

  if (sort_by) {
    if (sort_by === 'least_moves') {
      sortObj = { 'leastMoves': sort_direction };
    }
    else if (sort_by === 'ts') {
      sortObj = { 'ts': sort_direction };
    }
    else if (sort_by === 'reviews_score') {
      sortObj = [[ 'calc_reviews_score_laplace', sort_direction ], ['calc_reviews_score_avg', sort_direction ], [ 'calc_reviews_count', sort_direction ]];

      searchObj['calc_reviews_score_avg'] = { $gte: 0 };
    }
    else if (sort_by === 'total_reviews') {
      sortObj = { 'calc_reviews_count': sort_direction };
    }
    else if (sort_by === 'players_beaten') {
      sortObj = { 'calc_stats_players_beaten': sort_direction };
    }
  }

  let skip = 0;

  if (page) {
    skip = ((Math.abs(parseInt(page))) - 1) * limit;
  }

  if (show_filter === 'hide_won') {
    // get all my level completions
    const all_completions = await StatModel.find({ userId: userId, complete: true }, { levelId: 1 });

    searchObj['_id'] = { $nin: all_completions.map(c => c.levelId) };
  } else if (show_filter === 'only_attempted') {
    const all_completions = await StatModel.find({ userId: userId, complete: false }, { levelId: 1 });

    searchObj['_id'] = { $in: all_completions.map(c => c.levelId) };
  }

  if (block_filter === 'pp1') {
    searchObj['data'] = { $regex: /^[01234\n]+$/g };
  } else if (block_filter === 'pp2') {
    searchObj['data'] = { $regex: /[^01234\n]+/g };
  }

  try {
    const [levels, total] = await Promise.all([
      LevelModel.find<Level>(searchObj).sort(sortObj)
        .populate('userId', 'name').skip(skip).limit(limit),
      LevelModel.find<Level>(searchObj).countDocuments(),
    ]);

    return { data: levels, total: total };
  } catch (e) {
    return null;
  }
}

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();

  const levels = await doQuery(req.query as SearchQuery, req.userId);

  if (!levels) {
    return res.status(500).json({
      error: 'Error finding Levels',
    });
  }

  return res.status(200).json(levels);
});
