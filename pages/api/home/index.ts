import { GameId } from '@root/constants/GameId';
import { GameType } from '@root/constants/Games';
import StatFilter from '@root/constants/statFilter';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import Level from '@root/models/db/level';
import { LevelModel, StatModel } from '@root/models/mongoose';
import TimeRange from '../../../constants/timeRange';
import apiWrapper, { ValidType } from '../../../helpers/apiWrapper';
import { getUserFromToken } from '../../../lib/withAuth';
import User from '../../../models/db/user';
import { SearchQuery } from '../../[subdomain]/search';
import { getLatestLevels } from '../latest-levels';
import { getLatestReviews } from '../latest-reviews';
import { getLevelOfDay } from '../level-of-day';
import { getLastLevelPlayed } from '../play-attempt';
import { doQuery } from '../search';
import { getPlayAttempts } from '../user/play-history';

async function getTopLevelsThisMonth(gameId: GameId, reqUser: User | null) {
  const query = {
    disableCount: 'true',
    numResults: '5',
    sortBy: 'reviewScore',
    timeRange: TimeRange[TimeRange.Month],
  } as SearchQuery;

  const result = await doQuery(gameId, query, reqUser);

  return result?.levels;
}

async function getRecentAverageDifficulty(gameId: GameId, reqUser: User, numResults = 1) {
  const game = getGameFromId(gameId);
  const difficultyEstimate = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_completion_estimate' : 'calc_difficulty_estimate';
  const query = await StatModel.aggregate([
    { $match: { userId: reqUser._id, complete: true, gameId: gameId } },
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
              calc_difficulty_completion_estimate: 1,
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

  return query.length === 0 ? 0 : query.reduce((acc, level) => acc + level[difficultyEstimate], 0) / query.length;
}

async function getRecommendedLevel(gameId: GameId, reqUser: User) {
  const avgDifficulty = await getRecentAverageDifficulty(gameId, reqUser, 10);
  const recentPlayAttempts = await getPlayAttempts(gameId, reqUser, {}, 10);
  const uniqueLevelIdsFromRecentAttempts = new Set(recentPlayAttempts.map(playAttempt => playAttempt.levelId._id.toString()));

  const query = {
    disableCount: 'true',
    excludeLevelIds: [...uniqueLevelIdsFromRecentAttempts].join(','),
    minSteps: '7',
    maxSteps: '2500',
    minDifficulty: String(avgDifficulty * 0.9), // 10% below average of last 10
    minRating: '0.55',
    maxRating: '1',
    numResults: '20', // randomly select one of these
    sortBy: 'calcDifficultyEstimate',
    sortDir: 'asc',
    statFilter: StatFilter.HideSolved,
    timeRange: TimeRange[TimeRange.All],
  } as SearchQuery;

  const result = await doQuery(gameId, query, reqUser);
  let levels = result?.levels;

  if (!levels || levels.length === 0) {
    // try a broader query without min and max difficulty for those rare users that have solved so many levels to not have any recommended one
    const query = {
      disableCount: 'true',
      excludeLevelIds: [...uniqueLevelIdsFromRecentAttempts].join(','),
      minSteps: '7',
      maxSteps: '2500',
      minRating: '0.55',
      maxRating: '1',
      numResults: '10', // randomly select one of these
      sortBy: 'calcDifficultyEstimate',
      sortDir: 'asc',
      statFilter: StatFilter.HideSolved,
      timeRange: TimeRange[TimeRange.All],
    } as SearchQuery;

    const result = await doQuery(gameId, query, reqUser);

    levels = result?.levels;
  }

  if (!levels || levels.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * levels.length);

  return levels[randomIndex];
}

export default apiWrapper({
  GET: {
    query: {
      lastLevelPlayed: ValidType('number', false, true),
      latestLevels: ValidType('number', false, true),
      latestReviews: ValidType('number', false, true),
      levelOfDay: ValidType('number', false, true),
      recommendedLevel: ValidType('number', false, true),
      topLevelsThisMonth: ValidType('number', false, true),
    }
  }
}, async (req, res) => {
  const { lastLevelPlayed, latestLevels, latestReviews, levelOfDay, recommendedLevel, topLevelsThisMonth } = req.query;
  const token = req.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;

  const [
    pLastLevelPlayed,
    platestLevels,
    platestReviews,
    plevelOfDay,
    precommendedLevel,
    ptopLevelsThisMonth
  ] = await Promise.all([
    lastLevelPlayed && reqUser ? getLastLevelPlayed(req.gameId, reqUser) : undefined,
    latestLevels ? getLatestLevels(req.gameId, reqUser) : undefined,
    latestReviews ? getLatestReviews(req.gameId, reqUser) : undefined,
    levelOfDay ? getLevelOfDay(req.gameId, reqUser) : undefined,
    recommendedLevel && reqUser ? getRecommendedLevel(req.gameId, reqUser) : undefined,
    topLevelsThisMonth ? getTopLevelsThisMonth(req.gameId, reqUser) : undefined,
  ]);

  return res.status(200).json({
    lastLevelPlayed: pLastLevelPlayed,
    latestLevels: platestLevels,
    latestReviews: platestReviews,
    levelOfDay: plevelOfDay,
    recommendedLevel: precommendedLevel,
    topLevelsThisMonth: ptopLevelsThisMonth,
  });
});
