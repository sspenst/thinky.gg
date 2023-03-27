import TimeRange from '../../../constants/timeRange';
import { ValidType } from '../../../helpers/apiWrapper';
import { FilterSelectOption } from '../../../helpers/filterSelectOptions';
import withAuth from '../../../lib/withAuth';
import User from '../../../models/db/user';
import { LEVEL_SEARCH_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import { SearchQuery } from '../../search';
import { getLatestLevels } from '../latest-levels';
import { getLatestReviews } from '../latest-reviews';
import { getLevelOfDay } from '../level-of-day';
import { getLastLevelPlayed } from '../play-attempt';
import { doQuery } from '../search';

async function getTopLevelsThisMonth(reqUser: User) {
  const query = {
    disable_count: 'true',
    num_results: '5',
    sort_by: 'reviews_score',
    time_range: TimeRange[TimeRange.Month],
  } as SearchQuery;

  const result = await doQuery(query, reqUser, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });

  return result?.levels;
}

async function getRecommendedEasyLevel(reqUser: User) {
  const query = {
    disable_count: 'true',
    min_steps: '7',
    max_steps: '2500',
    min_rating: '0.55',
    max_rating: '1',
    num_results: '10', // randomly select one of these
    show_filter: FilterSelectOption.HideWon,
    sort_by: 'calc_difficulty_estimate',
    sort_dir: 'asc',
    time_range: TimeRange[TimeRange.All],
  } as SearchQuery;

  const result = await doQuery(query, reqUser, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });
  const levels = result?.levels;

  if (!levels || levels.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * levels.length);

  return levels[randomIndex];
}

async function getRecommendedPendingLevel(reqUser: User) {
  const query = {
    disable_count: 'true',
    difficulty_filter: 'Pending',
    num_results: '10', // randomly select one of these
    show_filter: FilterSelectOption.ShowUnattempted,
    sort_by: 'players_beaten',
    time_range: TimeRange[TimeRange.All],
  } as SearchQuery;

  const result = await doQuery(query, reqUser, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });
  const levels = result?.levels;

  if (!levels || levels.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * levels.length);

  return levels[randomIndex];
}

export default withAuth({
  GET: {
    query: {
      lastLevelPlayed: ValidType('number', false, true),
      latestLevels: ValidType('number', false, true),
      latestReviews: ValidType('number', false, true),
      levelOfDay: ValidType('number', false, true),
      recommendedEasyLevel: ValidType('number', false, true),
      recommendedPendingLevel: ValidType('number', false, true),
      topLevelsThisMonth: ValidType('number', false, true),
    }
  }
}, async (req, res) => {
  const reqUser = req.user;
  const { lastLevelPlayed, latestLevels, latestReviews, levelOfDay, recommendedEasyLevel, recommendedPendingLevel, topLevelsThisMonth } = req.query;
  const [
    plastLevelPlayed,
    platestLevels,
    platestReviews,
    plevelOfDay,
    precommendedEasyLevel,
    precommendedPendingLevel,
    ptopLevelsThisMonth
  ] = await Promise.all([
    lastLevelPlayed ? getLastLevelPlayed(reqUser) : undefined,
    latestLevels ? getLatestLevels(reqUser) : undefined,
    latestReviews ? getLatestReviews(reqUser) : undefined,
    levelOfDay ? getLevelOfDay(reqUser) : undefined,
    recommendedEasyLevel ? getRecommendedEasyLevel(reqUser) : undefined,
    recommendedPendingLevel ? getRecommendedPendingLevel(reqUser) : undefined,
    topLevelsThisMonth ? getTopLevelsThisMonth(reqUser) : undefined,
  ]);

  return res.status(200).json({
    lastLevelPlayed: plastLevelPlayed,
    latestLevels: platestLevels,
    latestReviews: platestReviews,
    levelOfDay: plevelOfDay,
    recommendedEasyLevel: precommendedEasyLevel,
    recommendedPendingLevel: precommendedPendingLevel,
    topLevelsThisMonth: ptopLevelsThisMonth,
  });
});
