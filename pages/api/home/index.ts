import TimeRange from '../../../constants/timeRange';
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
  const t = new Date();
  const query = {
    num_results: '5',
    sort_by: 'reviews_score',
    time_range: TimeRange[TimeRange.Month],
  } as SearchQuery;

  const result = await doQuery(query, reqUser._id, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });

  console.log('time taken for top levels this month: ' + (new Date().getTime() - t.getTime()) + 'ms');

  return result?.levels;
}

async function getRecommendedEasyLevel(reqUser: User) {
  const t = new Date();
  const query = {
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

  const result = await doQuery(query, reqUser._id, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });
  const levels = result?.levels;

  if (!levels || levels.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * levels.length);

  console.log('time taken for recommended easy level: ' + (new Date().getTime() - t.getTime()) + 'ms');

  return levels[randomIndex];
}

async function getRecommendedPendingLevel(reqUser: User) {
  const t = new Date();
  const query = {
    difficulty_filter: 'Pending',
    num_results: '10', // randomly select one of these
    show_filter: FilterSelectOption.ShowUnattempted,
    sort_by: 'players_beaten',
    time_range: TimeRange[TimeRange.All],
  } as SearchQuery;

  const result = await doQuery(query, reqUser._id, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });
  const levels = result?.levels;

  if (!levels || levels.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * levels.length);

  console.log('time taken for recommended pending level: ' + (new Date().getTime() - t.getTime()) + 'ms');

  return levels[randomIndex];
}

export default withAuth({
  GET: {}
}, async (req, res) => {
  const reqUser = req.user;
  const [
    lastLevelPlayed,
    latestLevels,
    latestReviews,
    levelOfDay,
    recommendedEasyLevel,
    recommendedPendingLevel,
    topLevelsThisMonth
  ] = await Promise.all([
    getLastLevelPlayed(reqUser),
    getLatestLevels(reqUser),
    getLatestReviews(reqUser),
    getLevelOfDay(reqUser),
    getRecommendedEasyLevel(reqUser),
    getRecommendedPendingLevel(reqUser),
    getTopLevelsThisMonth(reqUser),
  ]);

  return res.status(200).json({
    lastLevelPlayed,
    latestLevels,
    latestReviews,
    levelOfDay,
    recommendedEasyLevel,
    recommendedPendingLevel,
    topLevelsThisMonth,
  });
});
