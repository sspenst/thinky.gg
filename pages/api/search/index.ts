import { GameId } from '@root/constants/GameId';
import { GameType } from '@root/constants/Games';
import StatFilter from '@root/constants/statFilter';
import TileType from '@root/constants/tileType';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import isPro from '@root/helpers/isPro';
import { LEVEL_SEARCH_DEFAULT_PROJECTION, USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { CacheTag } from '@root/models/db/cache';
import { Aggregate, FilterQuery, PipelineStage, Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getDifficultyRangeFromName } from '../../../components/formatted/formattedDifficulty';
import GraphType from '../../../constants/graphType';
import TimeRange from '../../../constants/timeRange';
import apiWrapper from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps, getEnrichUserConfigPipelineStage } from '../../../helpers/enrich';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import { EnrichedLevel } from '../../../models/db/level';
import User from '../../../models/db/user';
import { CacheModel, GraphModel, LevelModel, StatModel, UserModel } from '../../../models/mongoose';
import { BlockFilterMask, SearchQuery } from '../../[subdomain]/search';

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

function generateCacheKey(gameId: GameId, query: SearchQuery): string {
  // Clone query and remove fields that shouldn't affect caching
  const queryForCache = { ...query };

  delete queryForCache.userId; // Remove userId since we pass it separately
  delete queryForCache.subdomain; // Remove token since it's used to derive userId

  const cacheParams = {
    gameId,
    ...queryForCache,
    // userId is NOT included because user-specific enrichment happens in a separate query
    // searchObj, sortObj, skip, limit, byStat are all derived from gameId and query
  };

  return JSON.stringify(cacheParams);
}

/**
 * Executes a search query for levels with optional caching.
 *
 * @param gameId - The game ID to search within
 * @param query - The search query parameters
 * @param reqUser - The requesting user (optional)
 * @param _projection - MongoDB projection object (optional)
 * @param skipCache - If true, bypasses cache entirely. If false/undefined, uses automatic cache detection based on user-specific filters
 * @returns SearchResult containing levels, searchAuthor, and totalRows
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function doQuery(gameId: GameId | undefined, query: SearchQuery, reqUser?: User | null, _projection: any = LEVEL_SEARCH_DEFAULT_PROJECTION, skipCache?: boolean) {
  await dbConnect();

  // NB: need to clone projection because we modify it below
  const projection = { ..._projection };

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
    ...(gameId !== undefined ? { gameId: gameId } : {}),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as FilterQuery<any>;
  const userId = reqUser?._id;

  if (query.search && query.search.length > 0) {
    searchObj['name'] = {
      $regex: cleanInput(query.search),
      $options: 'i',
    };
  }

  if (query.isRanked === 'true') {
    searchObj['isRanked'] = true;
  }

  let searchAuthor: User | null = null;

  if (query.searchAuthor && query.searchAuthor.length > 0) {
    const searchAuthorStr = cleanInput(query.searchAuthor);

    searchAuthor = await UserModel.findOne(
      { 'name': searchAuthorStr },
      'name hideStatus last_visited_at avatarUpdatedAt',
    ).lean<User>();

    cleanUser(searchAuthor);

    if (searchAuthor) {
      searchObj['userId'] = searchAuthor._id;
    }
  } else if (query.searchAuthorId) {
    if (Types.ObjectId.isValid(query.searchAuthorId)) {
      searchObj['userId'] = new Types.ObjectId(query.searchAuthorId);
    }
  }

  if (query.excludeLevelIds) {
    const excludeLevelIds = query.excludeLevelIds.split(',');

    searchObj['_id'] = { $nin: excludeLevelIds.map((id) => new Types.ObjectId(id)) };
  }

  if (query.includeLevelIds) {
    const includeLevelIds = query.includeLevelIds.split(',');

    searchObj['_id'] = { $in: includeLevelIds.map((id) => new Types.ObjectId(id)) };
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
  let byStat = false;
  const game = getGameFromId(gameId);
  const difficultyEstimate = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_completion_estimate' : 'calc_difficulty_estimate';
  const otherDifficultyEstimate = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_estimate' : 'calc_difficulty_completion_estimate';

  if (!isPro(reqUser)) {
  // strip other difficulty estimate from projection
    delete projection[otherDifficultyEstimate];
  }

  if (query.sortBy) {
    if (query.sortBy === 'userId') {
      sortObj.push(['userId.name', sortDirection]);
      lookupUserBeforeSort = true;
    } else if (query.sortBy === 'name') {
      sortObj.push(['name', sortDirection]);
    } else if (query.sortBy === 'collectionOrder') {
      sortObj.push(['collectionOrder', sortDirection]);
    } else if (query.sortBy === 'leastMoves') {
      sortObj.push(['leastMoves', sortDirection]);
    } else if (query.sortBy === 'ts') {
      sortObj.push(['ts', sortDirection]);
    } else if (query.sortBy === 'reviewScore') {
      sortObj.push(['calc_reviews_score_laplace', sortDirection], ['calc_reviews_score_avg', sortDirection], ['calc_reviews_count', sortDirection]);
      searchObj['calc_reviews_score_avg'] = { $gte: 0 };
    } else if (query.sortBy === 'total_reviews') {
      sortObj.push(['calc_reviews_count', sortDirection]);
    } else if (query.sortBy === 'solves') {
      sortObj.push(['calc_stats_players_beaten', sortDirection]);
    } else if (query.sortBy === 'calcDifficultyEstimate') {
      if (query.difficultyFilter === 'Pending') {
        const playAttemptCountField = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_playattempts_unique_users_count_excluding_author' : 'calc_playattempts_unique_users_count';

        // sort by unique users
        sortObj.push([playAttemptCountField, sortDirection * -1]);
      } else {
        sortObj.push([difficultyEstimate, sortDirection]);
        // don't show pending levels when sorting by difficulty
        searchObj[difficultyEstimate] = { $gte: 0 };
      }
    } else if (query.sortBy === 'calcOtherDifficultyEstimate') {
      if (query.difficultyFilter === 'Pending') {
        const playAttemptCountField = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_playattempts_unique_users_count' : 'calc_playattempts_unique_users_count_excluding_author';

        // sort by unique users
        sortObj.push([playAttemptCountField, sortDirection * -1]);
      } else {
        sortObj.push([otherDifficultyEstimate, sortDirection]);
        // don't show pending levels when sorting by difficulty
        searchObj[otherDifficultyEstimate] = { $gte: 0 };
      }
    } else if (query.sortBy === 'completed' && isPro(reqUser)) {
      sortObj.push(['userMovesTs', sortDirection]);
      byStat = true;
    }
  }

  sortObj.push(['_id', sortDirection]);

  let statLookupAndMatchStage: PipelineStage.FacetPipelineStage[] = [{
    $lookup: {
      from: StatModel.collection.name,
      let: { levelId: '$_id' },
      pipeline: [{
        $match: {
          $expr: {
            $and: [
              { $eq: ['$levelId', '$$levelId'] },
              { $eq: ['$userId', new Types.ObjectId(userId)] },
            ],
          },
        },
      }],
      as: 'stat',
    },
  }];

  if (query.statFilter === StatFilter.HideSolved) {
    statLookupAndMatchStage.push({
      $match: {
        $or: [
          { 'stat.complete': false },
          { 'stat.complete': { $exists: false } },
        ],
      },
    });
  } else if (query.statFilter === StatFilter.HideCompleted) {
    statLookupAndMatchStage.push({
      $match:
          { 'stat.complete': { $exists: false } },
    });
  } else if (query.statFilter === StatFilter.Solved) {
    statLookupAndMatchStage.push({
      $match: { 'stat.complete': true },
    });
  } else if (query.statFilter === StatFilter.Completed) {
    statLookupAndMatchStage.push({
      $match: { 'stat.complete': { $exists: true } },
    });
  } else if (query.statFilter === StatFilter.Unoptimized) {
    statLookupAndMatchStage.push({
      $match: { 'stat.complete': false },
    });
  } else if (query.statFilter === StatFilter.Unattempted) {
    projection['calc_playattempts_unique_users'] = 1;

    statLookupAndMatchStage.push(
      {
        $unwind: {
          path: '$stat',
          preserveNullAndEmptyArrays: true,
        }
      },
      // filter out levels where you have reached the finish (a stat exists),
      // and levels where you have started but not finished (a playattempt exists)
      {
        $match: {
          $and: [
            { 'stat': { $exists: false } },
            { 'calc_playattempts_unique_users': { $nin: [new Types.ObjectId(userId)] } },
          ],
        },
      },
      {
        $unset: 'calc_playattempts_unique_users',

      }
    );
  } else {
    statLookupAndMatchStage = [{ $unwind: '$_id' }];
  }

  const limit = Math.max(1, Math.min(parseInt(query.numResults as string) || 20, 20));
  const skip = query.page ? (parseInt(query.page) - 1) * limit : 0;

  if (query.difficultyFilter) {
    if (query.difficultyFilter === 'Pending') {
      searchObj[difficultyEstimate] = { $eq: -1 };
    } else {
      const difficulty = getDifficultyRangeFromName(query.difficultyFilter);
      const minValue = difficulty[0] as number;
      const maxValue = difficulty[1] as number;

      searchObj[difficultyEstimate] = {
        $gte: minValue,
        $lt: maxValue,
      };
    }
  }

  if (query.minDifficulty || query.maxDifficulty) {
    searchObj[difficultyEstimate] = {};

    if (query.minDifficulty) {
      searchObj[difficultyEstimate]['$gte'] = parseInt(query.minDifficulty);
    }

    if (query.maxDifficulty) {
      searchObj[difficultyEstimate]['$lte'] = parseInt(query.maxDifficulty);
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
    ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'userId._id', lookupAs: 'userId.config' }),
  ] as PipelineStage.Lookup[];

  // Add a stage to filter out levels from blocked users
  const blockFilterStage: PipelineStage[] = reqUser ? [
    // Lookup to check if the level author is blocked by the user
    {
      $lookup: {
        from: GraphModel.collection.name,
        let: { authorId: '$userId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$source', reqUser._id] },
                  { $eq: ['$target', '$$authorId'] },
                  { $eq: ['$type', GraphType.BLOCK] },
                  { $eq: ['$sourceModel', 'User'] },
                  { $eq: ['$targetModel', 'User'] }
                ]
              }
            }
          }
        ],
        as: 'blockStatus'
      }
    },
    // Only include levels where the author is not blocked
    {
      $match: {
        'blockStatus': { $size: 0 }
      }
    },
    // Remove the blockStatus field
    {
      $project: {
        blockStatus: 0
      }
    }
  ] : [];

  // Add a separate filter stage for after userId is unwound
  const blockFilterAfterUnwindStage: PipelineStage[] = reqUser ? [
    // Lookup to check if the level author is blocked by the user
    {
      $lookup: {
        from: GraphModel.collection.name,
        let: { authorId: '$userId._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$source', reqUser._id] },
                  { $eq: ['$target', '$$authorId'] },
                  { $eq: ['$type', GraphType.BLOCK] },
                  { $eq: ['$sourceModel', 'User'] },
                  { $eq: ['$targetModel', 'User'] }
                ]
              }
            }
          }
        ],
        as: 'blockStatus'
      }
    },
    // Only include levels where the author is not blocked
    {
      $match: {
        'blockStatus': { $size: 0 }
      }
    },
    // Remove the blockStatus field
    {
      $project: {
        blockStatus: 0
      }
    }
  ] : [];

  try {
    // Determine if we should skip cache for user-specific queries or if explicitly requested
    const shouldSkipCache = skipCache || (query.statFilter && query.statFilter !== StatFilter.All);

    // Create a cache key based on the search parameters
    const cacheKey = generateCacheKey(gameId ?? GameId.THINKY, query);

    // Try to get from cache first (unless we should skip cache)
    const cachedResult = !shouldSkipCache ? await CacheModel.findOne({ key: cacheKey, gameId: gameId }) : null;
    let res;

    if (cachedResult) {
      res = cachedResult.value;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let agg: Aggregate<any[]> | undefined = undefined;

      if (!byStat) {
        // Parse maxNumberPerAuthor if it exists
        const maxNumberPerAuthor = query.maxNumberPerAuthor ? parseInt(query.maxNumberPerAuthor) : undefined;

        // Prepare the facet pipeline with potential author limiting
        const facetPipeline = [
          ...(lookupUserBeforeSort ? lookupUserStage : []),
          // Apply block filter after looking up users but before further processing
          ...(lookupUserBeforeSort ? blockFilterAfterUnwindStage : []),
          // NB: projection is typically supposed to be the last stage of the pipeline, but we need it here because of potential sorting by calc_playattempts_unique_users_count
          { $project: { ...projection } },
          {
            $addFields: {
              collectionOrder: {
                $indexOfArray: [query.includeLevelIds?.split(','), { $toString: '$_id' }],
              }
            }
          },
          { $sort: sortObj.reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {}) },
          ...statLookupAndMatchStage,
        ];

        // Add author limiting steps if maxNumberPerAuthor is specified
        if (maxNumberPerAuthor !== undefined && maxNumberPerAuthor > 0) {
          facetPipeline.push(
            // Group by userId and collect levels
            {
              $group: {
                _id: '$userId',
                levels: { $push: '$$ROOT' },
                count: { $sum: 1 }
              }
            },
            // Slice to keep only the top N levels per author
            {
              $project: {
                levels: { $slice: ['$levels', maxNumberPerAuthor] }
              }
            },
            // Unwind to flatten back to individual documents
            { $unwind: '$levels' },
            // Replace the root with the original document
            { $replaceRoot: { newRoot: '$levels' } },
            // Re-sort to maintain original sort order
            { $sort: sortObj.reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {}) }
          );
        }

        // Add pagination after author limiting
        facetPipeline.push(
          { $skip: skip },
          { $limit: limit },
          ...(lookupUserBeforeSort ? [] : lookupUserStage),
          // If user lookup happens after pagination, apply block filter here
          ...(lookupUserBeforeSort ? [] : blockFilterAfterUnwindStage),
        );

        agg = LevelModel.aggregate([
          { $match: searchObj },
          {
            '$facet': {
              ...(query.disableCount === 'true' ? {} : {
                metadata: [
                  // NB: need this stage here because it alters the count
                  ...statLookupAndMatchStage,
                  ...(reqUser ? blockFilterStage as any[] : []), // Add block filter for accurate count
                  { $count: 'totalRows' },
                ]
              }),
              data: facetPipeline,
            },
          },
        ] as any);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let statMatchQuery: FilterQuery<any> = {};

        if (query.statFilter === StatFilter.HideSolved || query.statFilter === StatFilter.Unoptimized) {
          statMatchQuery = { complete: false };
        } else if (query.statFilter === StatFilter.Solved) {
          statMatchQuery = { complete: true };
        }

        // Create the byStat aggregation with block filtering
        const byStatPipeline: PipelineStage[] = [
          ...(lookupUserBeforeSort ? lookupUserStage : []),
          // Apply block filter after looking up users
          ...(lookupUserBeforeSort ? blockFilterAfterUnwindStage : []),
          // NB: projection is typically supposed to be the last stage of the pipeline, but we need it here because of potential sorting by calc_playattempts_unique_users_count
          // TODO: instead can have an optional $addFields here, then do the projection after
          { $project: { ...projection, userMovesTs: 1 } },
          { $sort: sortObj.reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {}) },
          { $skip: skip },
          { $limit: limit },
          ...(lookupUserBeforeSort ? [] : lookupUserStage),
          // If user lookup happens after pagination, apply block filter here
          ...(lookupUserBeforeSort ? [] : blockFilterAfterUnwindStage),
        ];

        agg = StatModel.aggregate([
          {
            $match: {
              userId: new Types.ObjectId(userId),
              ...(gameId ? { gameId: gameId } : {}),
              ...statMatchQuery,
            }
          },
          {
            $lookup: {
              from: LevelModel.collection.name,
              localField: 'levelId',
              foreignField: '_id',
              as: 'level',
              pipeline: [
                { $match: searchObj },
              ],
            },
          },
          {
            $unwind: '$level',
          },
          {
            $addFields: {
              'level.userMovesTs': '$ts',
            },
          },
          {
            $group: {
              _id: null,
              allLevels: { $push: '$level' }
            }
          },
          {
            $unwind: '$allLevels'
          },
          {
            $replaceRoot: {
              newRoot: '$allLevels'
            }
          },
          {
            '$facet': {
              ...(query.disableCount === 'true' ? {} : {
                metadata: [
                  ...(reqUser ? blockFilterStage as any[] : []), // Add block filter for accurate count
                  { $count: 'totalRows' },
                ]
              }),
              data: byStatPipeline,
            },
          },
        ] as any);
      }

      res = (await agg)[0];

      // Cache the result with 5 second expiration (unless we should skip cache)
      if (!shouldSkipCache) {
        const now = new Date();

        await CacheModel.findOneAndUpdate(
          { key: cacheKey },
          {
            key: cacheKey,
            value: res,
            tag: CacheTag.SEARCH_API,
            ...(gameId ? { gameId: gameId } : {}),
            createdAt: now,
            expireAt: new Date(now.getTime() + 5 * 60 * 1000), // 5 minutes
          },
          { upsert: true }
        );
      }
    }

    const levels: EnrichedLevel[] = res?.data ?? [];
    const totalRows = res?.metadata ? (res.metadata[0]?.totalRows ?? 0) : 0;

    // Enrich the levels with a secondary query
    if (levels.length > 0 && userId) {
      const enrichedLevels = await LevelModel.aggregate([
        {
          $match: {
            _id: { $in: levels.map(level => level._id) }
          }
        },
        ...getEnrichLevelsPipelineSteps(new Types.ObjectId(userId) as unknown as User) as PipelineStage.Lookup[]
      ]);

      // Merge the enriched data back into the original levels
      const enrichedMap = new Map(enrichedLevels.map(level => [level._id.toString(), level]));

      levels.forEach(level => {
        const enriched = enrichedMap.get(level._id.toString());

        if (enriched) {
          // Preserve the original level data and merge in the enriched data
          Object.assign(level, {
            ...level,
            ...enriched,
            // Ensure we don't lose any fields from the original level
            userId: level.userId || enriched.userId,
            _id: level._id,
            name: level.name,
            gameId: level.gameId,
            leastMoves: level.leastMoves,
            ts: level.ts,
            calc_difficulty_estimate: level.calc_difficulty_estimate,
            calc_difficulty_completion_estimate: level.calc_difficulty_completion_estimate,
            calc_playattempts_unique_users: level.calc_playattempts_unique_users,
            calc_playattempts_duration_sum: level.calc_playattempts_duration_sum,
            calc_playattempts_just_beaten_count: level.calc_playattempts_just_beaten_count,
          });
        }
      });
    }

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
  const gameId = getGameIdFromReq(req);
  const reqUser = token ? await getUserFromToken(token, req) : null;
  const query = await doQuery(gameId, req.query as SearchQuery, reqUser);

  if (!query) {
    return res.status(500).json({
      error: 'Error querying Levels',
    });
  }

  return res.status(200).json(query);
});
