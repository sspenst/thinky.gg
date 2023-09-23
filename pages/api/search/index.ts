import TileType from '@root/constants/tileType';
import isPro from '@root/helpers/isPro';
import { FilterQuery, PipelineStage, Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getDifficultyRangeFromName } from '../../../components/formatted/formattedDifficulty';
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
import { LevelModel, StatModel, UserModel } from '../../../models/mongoose';
import { LEVEL_SEARCH_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';
import { BlockFilterMask, SearchQuery } from '../../search';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDimensionLimits(query: SearchQuery, searchObj: FilterQuery<any>) {
  const maxDimensionOr = [];

  if (query.maxDimension1 && query.maxDimension2) {
    maxDimensionOr.push(
      {
        height: { $lte: parseInt(query.maxDimension1) },
        width: { $lte: parseInt(query.maxDimension2) },
      },
      {
        height: { $lte: parseInt(query.maxDimension2) },
        width: { $lte: parseInt(query.maxDimension1) },
      },
    );
  } else if (query.maxDimension1) {
    maxDimensionOr.push(
      {
        height: { $lte: parseInt(query.maxDimension1) },
      },
      {
        width: { $lte: parseInt(query.maxDimension1) },
      },
    );
  } else if (query.maxDimension2) {
    maxDimensionOr.push(
      {
        height: { $lte: parseInt(query.maxDimension2) },
      },
      {
        width: { $lte: parseInt(query.maxDimension2) },
      },
    );
  }

  const minDimensionOr = [];

  if (query.minDimension1 && query.minDimension2) {
    minDimensionOr.push(
      {
        height: { $gte: parseInt(query.minDimension1) },
        width: { $gte: parseInt(query.minDimension2) },
      },
      {
        height: { $gte: parseInt(query.minDimension2) },
        width: { $gte: parseInt(query.minDimension1) },
      },
    );
  } else if (query.minDimension1) {
    minDimensionOr.push(
      {
        height: { $gte: parseInt(query.minDimension1) },
      },
      {
        width: { $gte: parseInt(query.minDimension1) },
      },
    );
  } else if (query.minDimension2) {
    minDimensionOr.push(
      {
        height: { $gte: parseInt(query.minDimension2) },
      },
      {
        width: { $gte: parseInt(query.minDimension2) },
      },
    );
  }

  if (maxDimensionOr.length > 0 && minDimensionOr.length > 0) {
    searchObj['$and'] = [{ $or: maxDimensionOr }, { $or: minDimensionOr }];
  } else if (maxDimensionOr.length > 0) {
    searchObj['$or'] = maxDimensionOr;
  } else if (minDimensionOr.length > 0) {
    searchObj['$or'] = minDimensionOr;
  }
}

export function cleanInput(input: string) {
  return input.replace(/[^-a-zA-Z0-9_' ]/g, '.*');
}

export type SearchResult = {
  levels: EnrichedLevel[];
  searchAuthor: User | null;
  totalRows: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function doQuery(query: SearchQuery, reqUser?: User | null, projection: any = LEVEL_SEARCH_DEFAULT_PROJECTION) {
  await dbConnect();

  // filter out pro query options from non-pro users
  if (!isPro(reqUser)) {
    delete query.blockFilter;
    delete query.maxDimension1;
    delete query.maxDimension2;
    delete query.minDimension1;
    delete query.minDimension2;
  }

  const searchObj = {
    isDeleted: { $ne: true },
    isDraft: false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as FilterQuery<any>;
  const userId = reqUser?._id;

  if (query.search && query.search.length > 0) {
    searchObj['name'] = {
      $regex: cleanInput(query.search),
      $options: 'i',
    };
  }

  let searchAuthor: User | null = null;

  if (query.searchAuthor && query.searchAuthor.length > 0) {
    const searchAuthorStr = cleanInput(query.searchAuthor);

    searchAuthor = await UserModel.findOne<User>(
      { 'name': searchAuthorStr },
      'name hideStatus last_visited_at avatarUpdatedAt',
      { lean: true }
    );

    cleanUser(searchAuthor);

    if (searchAuthor) {
      searchObj['userId'] = searchAuthor._id;
    }
  } else if (query.searchAuthorId) {
    if (Types.ObjectId.isValid(query.searchAuthorId)) {
      searchObj['userId'] = new Types.ObjectId(query.searchAuthorId);
    }
  }

  if (query.minSteps && query.maxSteps) {
    searchObj['leastMoves'] = {
      $gte: parseInt(query.minSteps),
      $lte: parseInt(query.maxSteps),
    };
  }

  getDimensionLimits(query, searchObj);

  if (query.maxRating && query.minRating) {
    searchObj['calc_reviews_score_laplace'] = {
      $gte: parseFloat(query.minRating),
      $lte: parseFloat(query.maxRating),
    };
  }

  if (query.timeRange) {
    if (query.timeRange === TimeRange[TimeRange.Day]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 24 * 60 * 60 * 1000).getTime() / 1000;
    } else if (query.timeRange === TimeRange[TimeRange.Week]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime() / 1000;
    } else if (query.timeRange === TimeRange[TimeRange.Month]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime() / 1000;
    } else if (query.timeRange === TimeRange[TimeRange.Year]) {
      searchObj['ts'] = {};
      searchObj['ts']['$gte'] = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).getTime() / 1000;
    }
  }

  const sortDirection = (query.sortDir === 'asc') ? 1 : -1;
  const sortObj = [] as [string, number][];
  let lookupUserBeforeSort = false;
  let enrichLevelBeforeSort = false;

  if (query.sortBy) {
    if (query.sortBy === 'userId') {
      sortObj.push(['userId.name', sortDirection]);
      lookupUserBeforeSort = true;
    } else if (query.sortBy === 'name') {
      sortObj.push(['name', sortDirection]);
    } else if (query.sortBy === 'leastMoves') {
      sortObj.push(['leastMoves', sortDirection]);
    } else if (query.sortBy === 'ts') {
      sortObj.push(['ts', sortDirection]);
    } else if (query.sortBy === 'reviewScore') {
      sortObj.push(['calc_reviews_score_laplace', sortDirection], ['calc_reviews_score_avg', sortDirection], ['calc_reviews_count', sortDirection]);

      searchObj['calc_reviews_score_avg'] = { $gte: 0 };
    } else if (query.sortBy === 'total_reviews') {
      sortObj.push(['calc_reviews_count', sortDirection]);
    } else if (query.sortBy === 'playersBeaten') {
      sortObj.push(['calc_stats_players_beaten', sortDirection]);
    } else if (query.sortBy === 'calcDifficultyEstimate') {
      if (query.difficultyFilter === 'Pending') {
        // sort by unique users
        sortObj.push(['calc_playattempts_unique_users_count', sortDirection * -1]);
      } else {
        sortObj.push(['calc_difficulty_estimate', sortDirection]);
        // don't show pending levels when sorting by difficulty
        searchObj['calc_difficulty_estimate'] = { $gte: 0 };
      }
    } else if (query.sortBy === 'solved') {
      sortObj.push(['userMovesTs', sortDirection]);
      enrichLevelBeforeSort = true;
    }
  }

  sortObj.push(['_id', sortDirection]);

  let levelFilterStatLookupStage: PipelineStage[] = [{ $unwind: '$_id' }] as PipelineStage[];

  if (query.showFilter === FilterSelectOption.HideWon) {
    levelFilterStatLookupStage = [{
      $lookup: {
        from: StatModel.collection.name,
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
  } else if (query.showFilter === FilterSelectOption.ShowWon) {
    levelFilterStatLookupStage = [{
      $lookup: {
        from: StatModel.collection.name,
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
  } else if (query.showFilter === FilterSelectOption.ShowInProgress) {
    levelFilterStatLookupStage = [{
      $lookup: {
        from: StatModel.collection.name,
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
  } else if (query.showFilter === FilterSelectOption.ShowUnattempted) {
    projection['calc_playattempts_unique_users'] = 1;
    levelFilterStatLookupStage = [{
      $lookup: {
        from: StatModel.collection.name,
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

  const facetTotalFilterStage = query.disableCount === 'true' ? [] : [...levelFilterStatLookupStage];
  const limit = Math.max(1, Math.min(parseInt(query.numResults as string) || 20, 20));
  const skip = query.page ? (parseInt(query.page) - 1) * limit : 0;

  levelFilterStatLookupStage.push({ $skip: skip }, { $limit: limit });

  if (query.difficultyFilter) {
    if (query.difficultyFilter === 'Pending') {
      searchObj['calc_difficulty_estimate'] = { $eq: -1 };
    } else {
      const difficulty = getDifficultyRangeFromName(query.difficultyFilter);
      const minValue = difficulty[0] as number;
      const maxValue = difficulty[1] as number;

      searchObj['calc_difficulty_estimate'] = {
        $gte: minValue,
        $lt: maxValue,
      };
    }
  }

  if (query.minDifficulty || query.maxDifficulty) {
    searchObj['calc_difficulty_estimate'] = {};

    if (query.minDifficulty) {
      searchObj['calc_difficulty_estimate']['$gte'] = parseInt(query.minDifficulty);
    }

    if (query.maxDifficulty) {
      searchObj['calc_difficulty_estimate']['$lte'] = parseInt(query.maxDifficulty);
    }
  }

  // NB: skip regex for NONE for more efficient query
  if (query.blockFilter !== undefined && Number(query.blockFilter) !== BlockFilterMask.NONE) {
    const blockFilterMask = Number(query.blockFilter);
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
          from: UserModel.collection.name,
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
        ...(lookupUserBeforeSort ? lookupUserStage : []),
        ...(enrichLevelBeforeSort ? getEnrichLevelsPipelineSteps(new Types.ObjectId(userId) as unknown as User, '_id', '') : []),
        { $sort: sortObj.reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {}) },
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
            ...(enrichLevelBeforeSort ? [] : getEnrichLevelsPipelineSteps(new Types.ObjectId(userId) as unknown as User, '_id', '')),
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

    return { levels: levels, searchAuthor: searchAuthor, totalRows: totalRows } as SearchResult;
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
