import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';

import Level from '../../../models/db/level';
import { LevelModel } from '../../../models/mongoose';
import type { NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();

  const { name, username, author_note, min_moves, max_moves, time_range, sort_by, sort_dir } = req.query as {name:string, username: string, author_note:string, min_moves:string, max_moves:string, time_range:string, min_rating:string, sort_by:string, sort_dir:string};
  const searchObj = {} as {[key:string]:any};
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

  searchObj['createdAt'] = {}; // all time

  if (time_range) {
    if (time_range === '24h') {
      searchObj['createdAt']['$gte'] = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }
    else if (time_range === '7d') {
      searchObj['createdAt']['$gte'] = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
    else if (time_range === '30d') {
      searchObj['createdAt']['$gte'] = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  const sortObj = {} as {[key:string]:any};
  const sort_direction = (sort_dir === 'asc') ? 1 : -1;

  if (sort_by) {
    if (sort_by === 'rating') {
      sortObj['rating'] = sort_direction;
    }
    else if (sort_by === 'moves') {
      sortObj['leastMoves'] = sort_direction;
    }
    else if (sort_by === 'time') {
      sortObj['createdAt'] = sort_direction;
    }
    else if (sort_by === 'reviews_score') {
      sortObj['calc_reviews_score_avg'] = sort_direction;
      // minimum of 3 reviews needed
      searchObj['calc_reviews_score_count'] = {
        $gte: 3,
      };
    }
    else if (sort_by === 'total_reviews') {
      sortObj['calc_reviews_score_count'] = sort_direction;
    }
    else if (sort_by === 'players_beaten') {
      sortObj['calc_records_count'] = sort_direction;
    }
  }

  try {
    // limit to 10
    const levels = await LevelModel.find<Level>(searchObj
    ).sort(sortObj).limit(limit);

    if (!levels) {
      return res.status(500).json({
        error: 'Error finding Levels',
      });
    }

    return res.status(200).json(levels);
  }
  catch (e){
    return res.status(500).json({
      error: 'Error finding Levels ' + e,
    });
  }
});
