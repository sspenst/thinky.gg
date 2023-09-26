import StatFilter from '@root/constants/statFilter';
import Level from '@root/models/db/level';
import { LevelModel, StatModel } from '@root/models/mongoose';
import TimeRange from '../../../constants/timeRange';
import { ValidType } from '../../../helpers/apiWrapper';
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

async function getRecentAverageDifficulty(reqUser: User, numResults = 1) {
  const query = await StatModel.aggregate([
    { $match: { userId: reqUser._id, complete: true } },
    { $sort: { ts: -1 } },
    { $limit: numResults },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'levelId',
        foreignField: '_id',
        as: 'levelId',
        pipeline: [
          {
            $project: {
              calc_difficulty_estimate: 1,
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
    },
    { $replaceRoot: { newRoot: '$levelId' } },
  ]) as Level[];

  return query.length === 0 ? 0 : query.reduce((acc, level) => acc + level.calc_difficulty_estimate, 0) / query.length;
}

async function getRecommendedLevel(reqUser: User) {
  const avgDifficulty = await getRecentAverageDifficulty(reqUser, 10);

  const query = {
    disableCount: 'true',
    minSteps: '7',
    maxSteps: '2500',
    minDifficulty: String(avgDifficulty * 0.9), // 10% below average of last 10
    minRating: '0.55',
    maxRating: '1',
    numResults: '10', // randomly select one of these
    sortBy: 'calcDifficultyEstimate',
    sortDir: 'asc',
    statFilter: StatFilter.HideWon,
    timeRange: TimeRange[TimeRange.All],
  } as SearchQuery;

  const result = await doQuery(query, reqUser, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });
  let levels = result?.levels;

  if (!levels || levels.length === 0) {
    // try a broader query without min and max difficulty for those rare users that have beaten so many levels to not have any recommended one
    const query = {
      disableCount: 'true',
      minSteps: '7',
      maxSteps: '2500',
      minRating: '0.55',
      maxRating: '1',
      numResults: '10', // randomly select one of these
      sortBy: 'calcDifficultyEstimate',
      sortDir: 'asc',
      statFilter: StatFilter.HideWon,
      timeRange: TimeRange[TimeRange.All],
    } as SearchQuery;

    const result = await doQuery(query, reqUser, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });

    levels = result?.levels;
  }

  if (!levels || levels.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * levels.length);

  return levels[randomIndex];
}

async function getRecommendedUnattemptedLevel(reqUser: User) {
  const query = {
    disableCount: 'true',
    numResults: '10', // randomly select one of these
    sortBy: 'playersBeaten',
    statFilter: StatFilter.ShowUnattempted,
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
      recommendedLevel: ValidType('number', false, true),
      recommendedUnattemptedLevel: ValidType('number', false, true),
      topLevelsThisMonth: ValidType('number', false, true),
    }
  }
}, async (req, res) => {
  const reqUser = req.user;
  const { lastLevelPlayed, latestLevels, latestReviews, levelOfDay, recommendedLevel, recommendedUnattemptedLevel, topLevelsThisMonth } = req.query;
  const [
    plastLevelPlayed,
    platestLevels,
    platestReviews,
    plevelOfDay,
    precommendedLevel,
    precommendedUnattemptedLevel,
    ptopLevelsThisMonth
  ] = await Promise.all([
    lastLevelPlayed ? getLastLevelPlayed(reqUser) : undefined,
    latestLevels ? getLatestLevels(reqUser) : undefined,
    latestReviews ? getLatestReviews(reqUser) : undefined,
    levelOfDay ? getLevelOfDay(reqUser) : undefined,
    recommendedLevel ? getRecommendedLevel(reqUser) : undefined,
    recommendedUnattemptedLevel ? getRecommendedUnattemptedLevel(reqUser) : undefined,
    topLevelsThisMonth ? getTopLevelsThisMonth(reqUser) : undefined,
  ]);

  return res.status(200).json({
    lastLevelPlayed: plastLevelPlayed,
    latestLevels: platestLevels,
    latestReviews: platestReviews,
    levelOfDay: plevelOfDay,
    recommendedLevel: precommendedLevel,
    recommendedUnattemptedLevel: precommendedUnattemptedLevel,
    topLevelsThisMonth: ptopLevelsThisMonth,
  });
});
