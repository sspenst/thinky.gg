import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';

import Level from '../../../models/db/level';
import { LevelModel } from '../../../models/mongoose';
import type { NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';

export async function doQuery(query:any) {
  await dbConnect();

  const { name, author_note, min_moves, max_moves, time_range, page, sort_by, sort_dir } = query as {name:string, author_note:string, min_moves:string, max_moves:string, time_range:string, min_rating:string, page:string, sort_by:string, sort_dir:string};
  const searchObj = { 'isDraft': false } as {[key:string]:any};
  const limit = 10;

  if (name) {
    searchObj['name'] = {
      $regex: name,
      $options: 'i',
    };
  }

  if (author_note) {
    searchObj['authorNote'] = {
      $regex: author_note,
      $options: 'i',
    };
  }

  if (min_moves && max_moves) {
    searchObj['leastMoves'] = {
      $gte: parseInt(min_moves),
      $lt: parseInt(max_moves),
    };
  }

  if (time_range) {
    searchObj['ts'] = {}; // all time

    if (time_range === '24h') {
      searchObj['ts']['$gte'] = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }
    else if (time_range === '7d') {
      searchObj['ts']['$gte'] = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
    else if (time_range === '30d') {
      searchObj['ts']['$gte'] = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  let sortObj = {} as {[key:string]:any};
  const sort_direction = (sort_dir === 'asc') ? 1 : -1;

  if (sort_by) {
    if (sort_by === 'moves') {
      sortObj['leastMoves'] = sort_direction;
    }
    else if (sort_by === 'ts') {
      sortObj['ts'] = sort_direction;
    }
    else if (sort_by === 'reviews_score') {
      sortObj = [[ 'calc_reviews_score_laplace', sort_direction ], ['calc_reviews_score_avg', sort_direction ], [ 'calc_reviews_score_count', sort_direction ]];
      // make sure calc_reviews_score_laplace exists
      searchObj['calc_reviews_score_laplace'] = { $exists: true };
      searchObj['calc_reviews_score_avg'] = { $gt: 0 };
    }
    else if (sort_by === 'total_reviews') {
      sortObj['calc_reviews_score_count'] = sort_direction;
    }
    else if (sort_by === 'players_beaten') {
      sortObj['calc_records_count'] = sort_direction;
    }
  }

  let skip = 0;

  if (page) {
    skip = (Math.abs(parseInt(page))) * limit;
  }

  try {
    // limit to 10
    const total = await LevelModel.find<Level>(searchObj
    ).countDocuments();
    const levelsPromise = LevelModel.find<Level>(searchObj
    ).sort(sortObj).populate('userId', 'name').skip(skip).limit(limit);
    const levels = await levelsPromise;

    return { total: total, data: levels };
  } catch (e){
    console.trace(e);

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

  try {
    const levels = await doQuery(req.query);

    if (!levels) {
      return res.status(500).json({
        error: 'Error finding Levels',
      });
    }

    return res.status(200).json(levels);
  } catch (e){
    return res.status(500).json({
      error: 'Error finding Levels ' + e,
    });
  }
});
