import TileType from '@root/constants/tileType';
import isPro from '@root/helpers/isPro';
import { PipelineStage, Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getDifficultyRangeFromName } from '../../../components/difficultyDisplay';
import TimeRange from '../../../constants/timeRange';
import apiWrapper from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps } from '../../../helpers/enrich';
import { FilterSelectOption } from '../../../helpers/filterSelectOptions';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import { EnrichedLevel } from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel, UserModel } from '../../../models/mongoose';
import { LEVEL_SEARCH_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';
import { BlockFilterMask, SearchQuery } from '../../search';

export function cleanInput(input: string) {
  return input.replace(/[^-a-zA-Z0-9_' ]/g, '.*');
}

export type SearchResult = {
  levels: EnrichedLevel[];
  totalRows: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function doQuery(query: SearchQuery, reqUser?: User | null, projection: any = LEVEL_SEARCH_DEFAULT_PROJECTION) {
  await dbConnect();

  // filter out pro query options from non-pro users
  if (!isPro(reqUser)) {
    if (query['blockFilter']) {
      delete query['blockFilter'];
    }

    if (query['maxHeight']) {
      delete query['maxHeight'];
    }

    if (query['maxWidth']) {
      delete query['maxWidth'];
    }
  }

  const { blockFilter, difficultyFilter, disableCount, maxHeight, maxRating, maxSteps, maxWidth, minRating, minSteps, numResults, page, search, searchAuthor, searchAuthorId, showFilter, sortBy, sortDir, timeRange } = query;

  const disableCountBool = (disableCount === 'true');
  // limit is between 1-30
  const limit = Math.max(1, Math.min(parseInt(numResults as string) || 20, 20));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchObj = { isDeleted: { $ne: true }, isDraft: false } as { [key: string]: any };
  const userId = reqUser?._id;

  if (search && search.length > 0) {
    searchObj['name'] = {
      $regex: cleanInput(search),
      $options: 'i',
    };
  }

  if (searchAuthor && searchAuthor.length > 0) {
    const searchAuthorStr = cleanInput(searchAuthor);
    const user = await UserModel.findOne<User>({ 'name': searchAuthorStr }, {}, { lean: true });

    if (user) {
      searchObj['userId'] = user._id;
    }
  } else if (searchAuthorId) {
    if (Types.ObjectId.isValid(searchAuthorId)) {
      searchObj['userId'] = new Types.ObjectId(searchAuthorId);
    }
  }

  if (minSteps && maxSteps) {
    searchObj['leastMoves'] = {
      $gte: parseInt(minSteps),
      $lte: parseInt(maxSteps),
    };
  }

  if (maxHeight) {
    searchObj['height'] = {
      $lte: parseInt(maxHeight),
    };
  }

  if (maxWidth) {
    searchObj['width'] = {
      $lte: parseInt(maxWidth),
    };
  }

  if (maxRating && minRating) {
    searchObj['calc_reviews_score_laplace'] = {
      $gte: parseFloat(minRating),
      $lte: parseFloat(maxRating),
    };
  }

  if (timeRange) {
    if (timeRange === TimeRange[TimeRange.Day]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 24 * 60 * 60 * 1000).getTime() / 1000;
    } else if (timeRange === TimeRange[TimeRange.Week]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime() / 1000;
    } else if (timeRange === TimeRange[TimeRange.Month]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime() / 1000;
    } else if (timeRange === TimeRange[TimeRange.Year]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).getTime() / 1000;
    }
  }

  const sortDirection = (sortDir === 'asc') ? 1 : -1;
  const sortObj = [] as [string, number][];
  let lookupUserBeforeSort = false;

  if (sortBy) {
    if (sortBy === 'userId') {
      sortObj.push(['userId.name', sortDirection]);
      lookupUserBeforeSort = true;
    } else if (sortBy === 'name') {
      sortObj.push(['name', sortDirection]);
    } else if (sortBy === 'leastMoves') {
      sortObj.push(['leastMoves', sortDirection]);
    } else if (sortBy === 'ts') {
      sortObj.push(['ts', sortDirection]);
    } else if (sortBy === 'reviewScore') {
      sortObj.push(['calc_reviews_score_laplace', sortDirection], ['calc_reviews_score_avg', sortDirection], ['calc_reviews_count', sortDirection]);

      searchObj['calc_reviews_score_avg'] = { $gte: 0 };
    } else if (sortBy === 'total_reviews') {
      sortObj.push(['calc_reviews_count', sortDirection]);
    } else if (sortBy === 'playersBeaten') {
      sortObj.push(['calc_stats_players_beaten', sortDirection]);
    } else if (sortBy === 'calcDifficultyEstimate') {
      if (difficultyFilter === 'Pending') {
        // sort by unique users
        sortObj.push(['calc_playattempts_unique_users_count', sortDirection * -1]);
      } else {
        sortObj.push(['calc_difficulty_estimate', sortDirection]);
        // don't show pending levels when sorting by difficulty
        searchObj['calc_difficulty_estimate'] = { $gte: 0 };
      }
    }
  }

  sortObj.push(['_id', sortDirection]);

  let skip = 0;

  if (page) {
    skip = ((Math.abs(parseInt(page))) - 1) * limit;
  }

  let levelFilterStatLookupStage: PipelineStage[] = [{ $unwind: '$_id' }] as PipelineStage[];

  if (showFilter === FilterSelectOption.HideWon) {
    levelFilterStatLookupStage = [{
      $lookup: {
        from: 'stats',
        let: { levelId: '$_id' },
        pipeline: [{
          $match: {
            $expr: {
              $and: [
                { $eq: ['$levelId', '$$levelId'] },
                { $eq: ['$userId', new Types.ObjectId(userId)] },

              ]
            }
          },
        },
        ],
        as: 'stat',
      },
    },
    {
      $match: {
        $or: [
          { 'stat.complete': false },
          { 'stat.complete': { $exists: false } },
        ],
      },
    },
    ] as PipelineStage[];
  } else if (showFilter === FilterSelectOption.ShowWon) {
    levelFilterStatLookupStage = [{
      $lookup: {
        from: 'stats',
        let: { levelId: '$_id' },
        pipeline: [{
          $match: {
            $expr: {
              $and: [
                { $eq: ['$levelId', '$$levelId'] },
                { $eq: ['$userId', new Types.ObjectId(userId)] },
              ]
            }
          }
        }],
        as: 'stat',
      },
    },
    {
      $match: { 'stat.complete': true },
    }] as PipelineStage[];
  } else if (showFilter === FilterSelectOption.ShowInProgress) {
    levelFilterStatLookupStage = [{
      $lookup: {
        from: 'stats',
        let: { levelId: '$_id' },
        pipeline: [{
          $match: {
            $expr: {
              $and: [
                { $eq: ['$levelId', '$$levelId'] },
                { $eq: ['$userId', new Types.ObjectId(userId)] },
              ]
            }
          }
        }],
        as: 'stat',
      },
    },
    {
      $match: { 'stat.complete': false },
    }] as PipelineStage[];
  } else if (showFilter === FilterSelectOption.ShowUnattempted) {
    projection['calc_playattempts_unique_users'] = 1;
    levelFilterStatLookupStage = [{
      $lookup: {
        from: 'stats',
        let: { levelId: '$_id' },
        pipeline: [{
          $match: {
            $expr: {
              $and: [
                { $eq: ['$levelId', '$$levelId'] },
                { $eq: ['$userId', new Types.ObjectId(userId)] },
              ]
            }
          }
        }],
        as: 'stat',
      },
    },
    {
      $unwind: {
        path: '$stat',
        preserveNullAndEmptyArrays: true,
      }
    },
    // filter out levels where you have reached the finish (a stat exists),
    // and levels where you have started but not finished (a playattempt exists)
    {
      $match: { $and: [
        { 'stat': { $exists: false } },
        { 'calc_playattempts_unique_users': { $nin: [new Types.ObjectId(userId)] } }
      ] },
    },
    ] as PipelineStage[];
  }

  // copy levelFilterStatLookupStage to facetTotalFilterStage

  const facetTotalFilterStage = disableCountBool ? [] : [...levelFilterStatLookupStage];

  levelFilterStatLookupStage.push( {
    $skip: skip,
  },
  {
    $limit: limit,
  });

  if (difficultyFilter) {
    if (difficultyFilter === 'Pending') {
      searchObj['calc_difficulty_estimate'] = { $eq: -1 };
    } else {
      const difficulty = getDifficultyRangeFromName(difficultyFilter);
      const minValue = difficulty[0] as number;
      const maxValue = difficulty[1] as number;

      searchObj['calc_difficulty_estimate'] = {
        $gte: minValue,
        $lt: maxValue,
      };
    }
  }

  // NB: skip regex for NONE for more efficient query
  if (blockFilter !== undefined && Number(blockFilter) !== BlockFilterMask.NONE) {
    const blockFilterMask = Number(blockFilter);
    let mustNotContain = '';

    if (blockFilterMask & BlockFilterMask.BLOCK) {
      mustNotContain = mustNotContain + TileType.Block;
    }

    if (blockFilterMask & BlockFilterMask.HOLE) {
      mustNotContain = mustNotContain + TileType.Hole;
    }

    if (blockFilterMask & BlockFilterMask.RESTRICTED) {
      mustNotContain = mustNotContain + '6-9A-J';
    }

    const mustNotContainRegex = mustNotContain !== '' ? `(?!.*[${mustNotContain}])` : '';

    searchObj['data'] = { $regex: new RegExp(`^(${mustNotContainRegex}[0-9A-J\n]+)$`, 'g') };
  }

  try {
    const lookupUserStage = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
          pipeline: [
            { $project: { ...USER_DEFAULT_PROJECTION } },
          ],
        },
      },
      { $unwind: '$userId' },
    ] as PipelineStage.Lookup[];

    const [levelsAgg] = await Promise.all([
      LevelModel.aggregate([
        { $match: searchObj },
        { $project: { ...projection } },
        { $sort: sortObj.reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {}) },
        ...(lookupUserBeforeSort ? lookupUserStage : []),
        { '$facet': {
          metadata: [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...facetTotalFilterStage as any,
            { $count: 'totalRows' } ],
          data: [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...levelFilterStatLookupStage as any,
            ...(lookupUserBeforeSort ? [] : lookupUserStage),
            // note this last getEnrichLevelsPipeline is "technically a bit wasteful" if they select Hide Won or Show In Progress
            // Because technically the above levelFilterStatLookupStage will have this data already...
            // But since the results are limited by limit, this is constant time and not a big deal to do the lookup again...
            ...getEnrichLevelsPipelineSteps(new Types.ObjectId(userId) as unknown as User, '_id', '') as PipelineStage.Lookup[],
          ]
        } },
        {
          $unwind: {
            path: '$metadata',
            preserveNullAndEmptyArrays: true,
          }
        },
      ]),
    ]);

    const levels = levelsAgg[0]?.data as EnrichedLevel[];
    const totalRows = levelsAgg[0]?.metadata?.totalRows || 0;

    levels.forEach((level) => {
      cleanUser(level.userId);
    });

    return { levels: levels, totalRows: totalRows } as SearchResult;
  } catch (e) {
    logger.error(e);

    return null;
  }
}

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  await dbConnect();
  const token = req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const query = await doQuery(req.query as SearchQuery, reqUser);

  if (!query) {
    return res.status(500).json({
      error: 'Error querying Levels',
    });
  }

  return res.status(200).json(query);
});
