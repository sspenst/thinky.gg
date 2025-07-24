import { GameId } from '@root/constants/GameId';
import { GameType } from '@root/constants/Games';
import GraphType from '@root/constants/graphType';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import { getRecordsByUserId } from '@root/helpers/getRecordsByUserId';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import User from '@root/models/db/user';
import { AuthProvider } from '@root/models/db/userAuth';
import mongoose, { Types } from 'mongoose';
import { NextApiResponse } from 'next';
import { TimeFilter } from '../../../../../components/profile/profileInsights';
import Role from '../../../../../constants/role';
import { ValidEnum } from '../../../../../helpers/apiWrapper';
import isPro from '../../../../../helpers/isPro';
import { ProStatsUserType } from '../../../../../hooks/useProStatsUser';
import cleanUser from '../../../../../lib/cleanUser';
import withAuth, { NextApiRequestWithAuth } from '../../../../../lib/withAuth';
import { GraphModel, LevelModel, PlayAttemptModel, StatModel, UserAuthModel, UserModel } from '../../../../../models/mongoose';
import { AttemptContext } from '../../../../../models/schemas/playAttemptSchema';

function getTimeFilterCutoff(timeFilter?: string): number | null {
  if (!timeFilter) return null;

  const now = Math.floor(Date.now() / 1000);

  switch (timeFilter) {
  case TimeFilter.WEEK:
    return now - (60 * 60 * 24 * 7);
  case TimeFilter.MONTH:
    return now - (60 * 60 * 24 * 30);
  case TimeFilter.YEAR:
    return now - (60 * 60 * 24 * 365);
  default:
    return null;
  }
}

async function getDifficultyDataComparisons(gameId: GameId, userId: string, timeFilter?: string) {
  const game = getGameFromId(gameId);
  const difficultyEstimate = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_completion_estimate' : 'calc_difficulty_estimate';
  const timeCutoff = getTimeFilterCutoff(timeFilter);

  const matchStage: any = {
    userId: new mongoose.Types.ObjectId(userId),
    complete: true,
    isDeleted: { $ne: true },
    gameId: gameId
  };

  if (timeCutoff) {
    matchStage.ts = { $gt: timeCutoff };
  }

  // Now run the full pipeline with appropriate threshold
  const difficultyData = await StatModel.aggregate([
    {
      $match: matchStage,
    },
    {
      $sort: { userId: 1, ts: -1 }
    },
    {
      $project: {
        levelId: 1,
        ts: 1,
      },
    },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'levelId',
        foreignField: '_id',
        as: 'level',
        pipeline: [
          {
            $match: {
              [difficultyEstimate]: { $exists: true, $gte: 0 },
              // Only include levels that are at least 7 days old (ts is in seconds)
              ts: { $lt: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) }
              // Removed calc_playattempts_unique_users filter - field appears to be missing
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              slug: 1,
              difficulty: `$${difficultyEstimate}`,
              calc_playattempts_duration_sum: 1,
              calc_playattempts_just_beaten_count: 1,
            }
          }
        ]
      },
    },
    {
      $unwind: '$level',
    },
    {
      $lookup: {
        from: PlayAttemptModel.collection.name,
        let: { levelId: '$level._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$levelId', '$$levelId'] },
                  { $eq: ['$userId', new mongoose.Types.ObjectId(userId)] },
                  { $ne: ['$startTime', '$endTime'] },
                ],
              },
              attemptContext: { $in: [AttemptContext.JUST_SOLVED, AttemptContext.UNSOLVED] },
            },
          },
          {
            $group: {
              _id: '$levelId',
              sumDuration: { $sum: { $subtract: ['$endTime', '$startTime'] } },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              levelId: '$_id',
              sumDuration: 1,
              count: 1,
            },
          },
        ],
        as: 'myplayattempts',
      },
    },
    {
      $unwind: {
        path: '$myplayattempts',
        preserveNullAndEmptyArrays: true,
      }
    },
    {
      $addFields: {
        otherPlayattemptsAverageDuration: {
          $cond: {
            if: { $gt: ['$level.calc_playattempts_just_beaten_count', 1] },
            then: { $divide: ['$level.calc_playattempts_duration_sum', '$level.calc_playattempts_just_beaten_count'] },
            else: null
          }
        }
      }
    },
    {
      $project: {
        _id: '$level._id',
        name: '$level.name',
        slug: '$level.slug',
        difficulty: '$level.difficulty',
        ts: 1,
        myPlayattemptsSumDuration: '$myplayattempts.sumDuration',
        otherPlayattemptsAverageDuration: 1,
        calc_playattempts_just_beaten_count: '$level.calc_playattempts_just_beaten_count',
        performanceRatio: {
          $cond: {
            if: {
              $and: [
                { $gt: ['$myplayattempts.sumDuration', 0] },
                { $gt: ['$otherPlayattemptsAverageDuration', 0] }
              ]
            },
            then: { $divide: ['$otherPlayattemptsAverageDuration', '$myplayattempts.sumDuration'] },
            else: null
          }
        },
        difficultyTier: {
          $switch: {
            branches: [
              { case: { $lt: ['$level.difficulty', 500] }, then: 'Easy' },
              { case: { $lt: ['$level.difficulty', 1000] }, then: 'Medium' },
              { case: { $lt: ['$level.difficulty', 1500] }, then: 'Hard' },
              { case: { $lt: ['$level.difficulty', 2000] }, then: 'Expert' },
              { case: { $gte: ['$level.difficulty', 2000] }, then: 'Master' },
            ],
            default: 'Unknown'
          }
        }
      },
    },
    // NOTE: Temporarily removing the final filter to see what we get
    // {
    //   $match: {
    //     myPlayattemptsSumDuration: { $gt: 0 },
    //     otherPlayattemptsAverageDuration: { $gt: 0 }
    //   }
    // }
  ]);

  return difficultyData;
}

async function getPlayLogForUsersCreatedLevels(gameId: GameId, reqUser: User, userId: string, timeFilter?: string) {
  const timeCutoff = getTimeFilterCutoff(timeFilter);

  try {
    // Create a combined aggregation that gets both engagement metrics AND creator levels in one query
    const engagementAndLevelsPromise = LevelModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isDraft: { $ne: true },
          isDeleted: { $ne: true },
          gameId: gameId,
        },
      },
      {
        $sort: { _id: -1 }
      },
      {
        $limit: 100000 // Last 100 levels only
      },
      {
        $lookup: {
          from: StatModel.collection.name,
          localField: '_id',
          foreignField: 'levelId',
          as: 'stats',
          pipeline: [
            {
              $match: {
                complete: true,
                isDeleted: { $ne: true },
                gameId: gameId,
                ...(timeCutoff ? { ts: { $gt: timeCutoff } } : {}),
              }
            }
          ]
        },
      },
      {
        $facet: {
          // Get the creator levels data
          creatorLevels: [
            {
              $project: {
                _id: 1,
                name: 1,
                slug: 1,
                data: 1,
                calc_difficulty_estimate: 1,
                calc_stats_completed_count: 1,
                calc_playattempts_unique_users: 1,
              }
            }
          ],
          // Get engagement metrics from the stats
          engagementMetrics: [
            {
              $unwind: {
                path: '$stats',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $match: {
                stats: { $exists: true }
              }
            },
            {
              $group: {
                _id: null,
                totalSolves: { $sum: 1 },
                uniquePlayerIds: { $addToSet: '$stats.userId' },
              }
            },
            {
              $project: {
                _id: 0,
                totalSolves: 1,
                uniquePlayersCount: { $size: '$uniquePlayerIds' },
              }
            }
          ]
        }
      }
    ]);

    const topSolverPromise = LevelModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isDraft: { $ne: true },
          isDeleted: { $ne: true },
          gameId: gameId,
        },
      },
      {
        $sort: { _id: -1 }
      },
      {
        $limit: 10000
      },
      {
        $lookup: {
          from: StatModel.collection.name,
          localField: '_id',
          foreignField: 'levelId',
          as: 'stats',
          pipeline: [
            {
              $match: {
                complete: true,
                isDeleted: { $ne: true },
                gameId: gameId,
                ...(timeCutoff ? { ts: { $gt: timeCutoff } } : {}),
              }
            }
          ]
        },
      },
      {
        $unwind: '$stats'
      },
      {
        $group: {
          _id: '$stats.userId',
          solveCount: { $sum: 1 },
        },
      },
      {
        $sort: { solveCount: -1 }
      },
      {
        $limit: 1
      },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                ...USER_DEFAULT_PROJECTION
              }
            }
          ]
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          _id: 0,
          solveCount: 1,
          user: 1,
        },
      },
    ]);

    // Simplified popularity trends
    const trendLimit = timeCutoff ? 90 : 30;
    const trendCutoff = Math.max(timeCutoff || 0, Math.floor(Date.now() / 1000) - (trendLimit * 24 * 60 * 60));

    const popularityTrendsPromise = LevelModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isDraft: { $ne: true },
          isDeleted: { $ne: true },
          gameId: gameId,
        },
      },
      {
        $sort: { ts: -1 }
      },
      {
        $limit: 10000 // last 100 levels only
      },
      {
        $lookup: {
          from: StatModel.collection.name,
          localField: '_id',
          foreignField: 'levelId',
          as: 'stats',
          pipeline: [
            {
              $match: {
                complete: true,
                isDeleted: { $ne: true },
                gameId: gameId,
                ts: { $gt: trendCutoff },
              }
            }
          ]
        },
      },
      {
        $unwind: '$stats'
      },
      {
        $group: {
          _id: {
            $dateFromParts: {
              year: { $year: { $toDate: { $multiply: ['$stats.ts', 1000] } } },
              month: { $month: { $toDate: { $multiply: ['$stats.ts', 1000] } } },
              day: { $dayOfMonth: { $toDate: { $multiply: ['$stats.ts', 1000] } } }
            }
          },
          totalSolves: { $sum: 1 },
          uniquePlayerIds: { $addToSet: '$stats.userId' },
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalSolves: 1,
          uniquePlayers: { $size: '$uniquePlayerIds' },
        }
      },
      {
        $sort: { date: -1 }
      },
      {
        $limit: 90
      }
    ]);

    const recentPlayLogPromise = LevelModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isDraft: { $ne: true },
          isDeleted: { $ne: true },
          gameId: gameId,
        },
      },
      {
        $sort: { _id: -1 }
      },
      {
        $limit: 10000
      },
      {
        $lookup: {
          from: StatModel.collection.name,
          localField: '_id',
          foreignField: 'levelId',
          as: 'stats',
          pipeline: [
            {
              $match: {
                complete: true,
                isDeleted: { $ne: true },
                gameId: gameId,
                ...(timeCutoff ? { ts: { $gt: timeCutoff } } : {}),
              }
            },
            {
              $sort: { ts: -1 }
            },
            {
              $limit: 25
            }
          ]
        },
      },
      {
        $unwind: '$stats'
      },
      {
        $sort: { 'stats.ts': -1 }
      },
      {
        $limit: 25
      },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: 'stats.userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                ...USER_DEFAULT_PROJECTION
              }
            }
          ]
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          _id: 0,
          levelId: {
            _id: '$_id',
            name: '$name',
            slug: '$slug'
          },
          statTs: '$stats.ts',
          user: 1,
        },
      },
    ]);

    // Execute all queries in parallel
    const [
      engagementAndLevelsResult,
      topSolverData,
      popularityTrends,
      recentPlayLog
    ] = await Promise.all([
      engagementAndLevelsPromise,
      topSolverPromise,
      popularityTrendsPromise,
      recentPlayLogPromise
    ]);

    // Extract results from facet
    const creatorLevels = engagementAndLevelsResult[0]?.creatorLevels || [];
    const engagementMetrics = engagementAndLevelsResult[0]?.engagementMetrics[0] || { totalSolves: 0, uniquePlayersCount: 0 };

    // Level performance from the creator levels we already have
    const levelPerformance = creatorLevels
      .filter((level: any) => (level.calc_stats_completed_count || 0) > 0)
      .map((level: any) => ({
        name: level.name,
        slug: level.slug,
        solveCount: level.calc_stats_completed_count || 0,
        uniquePlayers: level.calc_playattempts_unique_users?.length || 0,
        calc_stats_completed_count: level.calc_stats_completed_count || 0,
      }))
      .sort((a: any, b: any) => b.solveCount - a.solveCount)
      .slice(0, 10);

    // Clean user data
    recentPlayLog.forEach((entry) => {
      if (entry.user) {
        cleanUser(entry.user);
      }
    });

    if (topSolverData.length > 0 && topSolverData[0].user) {
      cleanUser(topSolverData[0].user);
    }

    return {
      creatorLevels,
      engagementMetrics,
      topSolver: topSolverData[0] || null,
      popularityTrends,
      levelPerformance,
      playLog: recentPlayLog
    };
  } catch (error) {
    console.error('Error in getPlayLogForUsersCreatedLevels:', error);

    // Return minimal fallback data on timeout/error - also limit to last 100 levels
    const creatorLevels = await LevelModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      isDraft: { $ne: true },
      isDeleted: { $ne: true },
      gameId: gameId,
    }).select({
      _id: 1,
      name: 1,
      slug: 1,
      data: 1,
      calc_difficulty_estimate: 1,
      calc_stats_completed_count: 1,
      calc_playattempts_unique_users: 1,
    }).sort({ _id: -1 }).lean().limit(100);

    return {
      creatorLevels,
      engagementMetrics: {
        totalSolves: 0,
        uniquePlayersCount: 0,
      },
      topSolver: null,
      popularityTrends: [],
      levelPerformance: creatorLevels
        .filter((level: any) => (level.calc_stats_completed_count || 0) > 0)
        .slice(0, 10)
        .map((level: any) => ({
          name: level.name,
          slug: level.slug,
          solveCount: level.calc_stats_completed_count || 0,
          uniquePlayers: level.calc_playattempts_unique_users?.length || 0,
          calc_stats_completed_count: level.calc_stats_completed_count || 0,
        })),
      playLog: []
    };
  }
}

async function getMostSolvesForUserLevels(gameId: GameId, userId: string, timeFilter?: string) {
  const timeCutoff = getTimeFilterCutoff(timeFilter);
  /** get the users that have solved the most levels created by userId */
  const mostSolvesForUserLevels = await LevelModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isDraft: { $ne: true },
        isDeleted: { $ne: true },
        gameId: gameId,
      },
    },
    {
      $lookup: {
        from: StatModel.collection.name,
        localField: '_id',
        foreignField: 'levelId',
        as: 'stats',
      },
    },
    {
      $unwind: '$stats',
    },
    {
      $match: {
        'stats.complete': true,
        'stats.isDeleted': { $ne: true },
        ...(timeCutoff ? { 'stats.ts': { $gt: timeCutoff } } : {}),
      },
    },
    {
      $group: {
        _id: '$stats.userId',
        sum: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $project: {
        _id: 0,
        sum: 1,
        user: {
          ...USER_DEFAULT_PROJECTION
        },
      },
    },
    ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'user._id', lookupAs: 'user.config' }),
    {
      $sort: {
        sum: -1,
        'user.name': 1,
      },
    },
    {
      $limit: 100,
    },
  ]);

  // cleanUser for each user
  mostSolvesForUserLevels.forEach((userAndSum) => {
    cleanUser(userAndSum.user);
  });

  return mostSolvesForUserLevels;
}

async function getScoreHistory(gameId: GameId, userId: string, timeFilter?: string) {
  const timeCutoff = getTimeFilterCutoff(timeFilter);

  const matchStage: any = {
    userId: new mongoose.Types.ObjectId(userId),
    isDeleted: { $ne: true },
    complete: true,
    gameId: gameId,
  };

  if (timeCutoff) {
    matchStage.ts = { $gt: timeCutoff };
  }

  // OPTIMIZED: Optimize date grouping (MongoDB Atlas will use indexes automatically)
  const history = await StatModel.aggregate([
    {
      $match: matchStage,
    },
    // OPTIMIZATION: Group by date more efficiently using $dateFromParts
    {
      $group: {
        _id: {
          $dateFromParts: {
            year: { $year: { $toDate: { $multiply: ['$ts', 1000] } } },
            month: { $month: { $toDate: { $multiply: ['$ts', 1000] } } },
            day: { $dayOfMonth: { $toDate: { $multiply: ['$ts', 1000] } } }
          }
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: -1 },
    },
    // OPTIMIZATION: Server-side formatting
    {
      $project: {
        date: '$_id',
        sum: '$count',
      }
    }
  ]);

  return history;
}

async function getFollowerActivityPatterns(gameId: GameId, userId: string) {
  // Only analyze last 30 days for follower activity
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

  // Check if user has Discord connected
  const discordConnection = await UserAuthModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    provider: AuthProvider.DISCORD
  });

  // Get all followers of this user
  const followers = await GraphModel.aggregate([
    {
      $match: {
        target: new mongoose.Types.ObjectId(userId),
        type: GraphType.FOLLOW
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'source',
        foreignField: '_id',
        as: 'follower'
      }
    },
    {
      $unwind: '$follower'
    },
    {
      $project: {
        followerId: '$follower._id',
        followerName: '$follower.name'
      }
    }
  ]);

  if (followers.length < 5) {
    return {
      followerCount: followers.length,
      activeFollowerCount: 0,
      hasDiscordConnected: !!discordConnection,
      hourlyActivity: [],
      dailyActivity: [],
      recommendations: {
        bestHour: -1,
        bestDay: -1,
        bestTimeLabel: 'Not enough followers for analysis',
        bestDayLabel: 'Need at least 5 followers',
        activityScore: 0
      }
    };
  }

  const followerIds = followers.map(f => f.followerId);

  // Get play attempts from followers in the last 30 days
  const followerActivity = await PlayAttemptModel.aggregate([
    {
      $match: {
        userId: { $in: followerIds },
        endTime: { $gte: thirtyDaysAgo },
        gameId: gameId,
        isDeleted: { $ne: true }
      }
    },
    {
      $project: {
        userId: 1,
        endTime: 1,
        hour: { $hour: { $toDate: { $multiply: ['$endTime', 1000] } } },
        dayOfWeek: { $dayOfWeek: { $toDate: { $multiply: ['$endTime', 1000] } } }
      }
    }
  ]);

  // Count active followers (those who had any activity in last 30 days)
  const activeFollowerIds = new Set(followerActivity.map(a => a.userId.toString()));
  const activeFollowerCount = activeFollowerIds.size;

  if (activeFollowerCount < 5) {
    return {
      followerCount: followers.length,
      activeFollowerCount: activeFollowerCount,
      hasDiscordConnected: !!discordConnection,
      hourlyActivity: [],
      dailyActivity: [],
      recommendations: {
        bestHour: -1,
        bestDay: -1,
        bestTimeLabel: 'Not enough active followers',
        bestDayLabel: 'Need at least 5 active followers',
        activityScore: 0
      }
    };
  }

  // Create a comprehensive day-hour heatmap data (7 days x 24 hours = 168 combinations)
  const heatmapData: Array<{
    dayOfWeek: number;
    hour: number;
    activityCount: number;
    activeFollowers: number;
  }> = [];

  // Generate all day-hour combinations
  for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) { // 1=Sunday, 7=Saturday
    for (let hour = 0; hour < 24; hour++) {
      const dayHourActivities = followerActivity.filter(a =>
        a.dayOfWeek === dayOfWeek && a.hour === hour
      );
      const activeFollowersThisDayHour = new Set(dayHourActivities.map(a => a.userId.toString())).size;

      heatmapData.push({
        dayOfWeek,
        hour,
        activityCount: dayHourActivities.length,
        activeFollowers: activeFollowersThisDayHour
      });
    }
  }

  // Find best time - prioritize active followers, with activity count as tiebreaker
  const bestTimeData = heatmapData.reduce((best, current) => {
    if (current.activeFollowers > best.activeFollowers) {
      return current;
    } else if (current.activeFollowers === best.activeFollowers) {
      // Tiebreaker: use activity count
      return current.activityCount > best.activityCount ? current : best;
    }

    return best;
  });

  // Legacy hourly and daily aggregations for backward compatibility
  const hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
    const hourActivities = followerActivity.filter(a => a.hour === hour);
    const activeFollowersThisHour = new Set(hourActivities.map(a => a.userId.toString())).size;

    return {
      hour,
      activityCount: hourActivities.length,
      activeFollowers: activeFollowersThisHour
    };
  });

  const dailyActivity = Array.from({ length: 7 }, (_, index) => {
    const dayOfWeek = index + 1; // MongoDB dayOfWeek is 1-based
    const dayActivities = followerActivity.filter(a => a.dayOfWeek === dayOfWeek);
    const activeFollowersThisDay = new Set(dayActivities.map(a => a.userId.toString())).size;

    return {
      dayOfWeek,
      activityCount: dayActivities.length,
      activeFollowers: activeFollowersThisDay
    };
  });

  // Create readable labels
  const hourLabels = [
    '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
    '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'
  ];

  const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return {
    followerCount: followers.length,
    activeFollowerCount: activeFollowerCount,
    hasDiscordConnected: !!discordConnection,
    heatmapData,
    hourlyActivity, // Keep for backward compatibility
    dailyActivity, // Keep for backward compatibility
    recommendations: {
      bestHour: bestTimeData.hour,
      bestDay: bestTimeData.dayOfWeek - 1, // Convert to 0-based index (0=Sunday, 1=Monday, etc.)
      bestTimeLabel: hourLabels[bestTimeData.hour],
      bestDayLabel: dayLabels[bestTimeData.dayOfWeek - 1], // Convert to 0-based index
      activityScore: Math.round((bestTimeData.activeFollowers * 2 + bestTimeData.activityCount) / activeFollowerCount * 100)
    }
  };
}

export default withAuth({
  GET: {
    query: {
      type: ValidEnum(Object.values(ProStatsUserType)),
    }
  }
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const isAdmin = req.user?.roles?.includes(Role.ADMIN);
  const hasAccess = isPro(req.user) || isAdmin;

  if (!hasAccess) {
    return res.status(401).json({
      error: 'Not authorized',
    });
  }

  const { id: userId, type, timeFilter } = req.query as { id: string, type: string, timeFilter?: string };
  let scoreHistory, difficultyLevelsComparisons, mostSolvesForUserLevels, playLogForUserCreatedLevels, records, followerActivityPatterns;

  if (type === ProStatsUserType.DifficultyLevelsComparisons) {
    // Allow access if user is viewing their own data OR if they're an admin
    if (userId !== req.user._id.toString() && !isAdmin) {
      return res.status(401).json({
        error: 'Not authorized',
      });
    }

    difficultyLevelsComparisons = await getDifficultyDataComparisons(req.gameId, userId, timeFilter);
  } else if (type === ProStatsUserType.ScoreHistory) {
    scoreHistory = await getScoreHistory(req.gameId, userId, timeFilter);
  } else if (type === ProStatsUserType.MostSolvesForUserLevels) {
    mostSolvesForUserLevels = await getMostSolvesForUserLevels(req.gameId, userId, timeFilter);
  } else if (type === ProStatsUserType.PlayLogForUserCreatedLevels) {
    playLogForUserCreatedLevels = await getPlayLogForUsersCreatedLevels(req.gameId, req.user, userId, timeFilter);
  } else if (type === ProStatsUserType.Records) {
    records = await getRecordsByUserId(req.gameId, new Types.ObjectId(userId), req.user);
  } else if (type === ProStatsUserType.FollowerActivityPatterns) {
    followerActivityPatterns = await getFollowerActivityPatterns(req.gameId, userId);
  }

  const response = {
    [ProStatsUserType.ScoreHistory]: scoreHistory,
    [ProStatsUserType.DifficultyLevelsComparisons]: difficultyLevelsComparisons,
    [ProStatsUserType.MostSolvesForUserLevels]: mostSolvesForUserLevels,
    [ProStatsUserType.PlayLogForUserCreatedLevels]: playLogForUserCreatedLevels,
    [ProStatsUserType.Records]: records,
    [ProStatsUserType.FollowerActivityPatterns]: followerActivityPatterns,
  };

  return res.status(200).json(response);
});
