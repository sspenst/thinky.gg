import { StatModel } from '@root/models/mongoose';
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
    disableCount: 'true',
    numResults: '5',
    sortBy: 'reviewScore',
    timeRange: TimeRange[TimeRange.Month],
  } as SearchQuery;

  const result = await doQuery(query, reqUser, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });

  return result?.levels;
}

async function getLastLevelsCompleted(reqUser: User, numResults = 1) {
  const query = await StatModel.aggregate([
    { $match: { userId: reqUser._id, complete: true } },
    { $sort: { ts: -1 } },
    { $limit: numResults },
    // lookup the levels
    {
      $lookup: {
        from: 'levels',
        localField: 'levelId',
        foreignField: '_id',
        as: 'levelId',
        pipeline: [
          {
            $project: {
              ...LEVEL_SEARCH_DEFAULT_PROJECTION
            }
          }
        ]
      }
    },
    {
      $unwind: {
        path: '$levelId',
        preserveNullAndEmptyArrays: true
      }
    }
  ]);

  return query;
}

async function getRecommendedEasyLevel(reqUser: User) {
  // let's get the difficulty range of the last 10 levels beaten
  const lastLevels = await getLastLevelsCompleted(reqUser, 10);
  // get the average difficulty
  const avgDifficulty = lastLevels?.length >= 10 ? lastLevels.reduce((acc, level) => acc + level.levelId.calc_difficulty_estimate, 0) / lastLevels.length : 0;

  const query = {
    disableCount: 'true',
    minSteps: '7',
    maxSteps: '2500',
    minDifficulty: '' + (avgDifficulty * 0.9), // 10% below average of last 10
    maxDifficulty: '99999999',
    minRating: '0.55',
    maxRating: '1',
    numResults: '10', // randomly select one of these
    showFilter: FilterSelectOption.HideWon,
    sortBy: 'calcDifficultyEstimate',
    sortDir: 'asc',
    timeRange: TimeRange[TimeRange.All],
  } as SearchQuery;

  const result = await doQuery(query, reqUser, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });
  const levels = result?.levels;

  if (!levels || levels.length === 0) {
    // try a broader query without min and max difficulty for those rare users that have beaten so many levels to not have any recommended one
    const query = {
      disableCount: 'true',
      minSteps: '7',
      maxSteps: '2500',
      minRating: '0.55',
      maxRating: '1',
      numResults: '10', // randomly select one of these
      showFilter: FilterSelectOption.HideWon,
      sortBy: 'calcDifficultyEstimate',
      sortDir: 'asc',
      timeRange: TimeRange[TimeRange.All],
    } as SearchQuery;

    const result = await doQuery(query, reqUser, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });
    const levels = result?.levels;

    return levels;
  }

  const randomIndex = Math.floor(Math.random() * levels.length);

  return levels[randomIndex];
}

async function getRecommendedPendingLevel(reqUser: User) {
  const query = {
    disableCount: 'true',
    difficultyFilter: 'Pending',
    numResults: '10', // randomly select one of these
    showFilter: FilterSelectOption.ShowUnattempted,
    sortBy: 'playersBeaten',
    timeRange: TimeRange[TimeRange.All],
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
