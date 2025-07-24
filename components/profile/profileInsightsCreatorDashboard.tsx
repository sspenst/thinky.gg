import Role from '@root/constants/role';
import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import TileType from '../../constants/tileType';
import User from '../../models/db/user';
import { difficultyList, getDifficultyFromEstimate } from '../formatted/formattedDifficulty';
import { TimeFilter } from './profileInsights';
import ProfileInsightsLevelPlayLog from './profileInsightsLevelPlayLog';
import ProfileInsightsMostSolves from './profileInsightsMostSolves';

dayjs.extend(utc);
dayjs.extend(timezone);

interface ProfileInsightsCreatorDashboardProps {
  user: User;
  reqUser: User | null;
  timeFilter: TimeFilter;
}

interface LevelPopularityData {
  date: string;
  plays: number;
  uniquePlayers: number;
}

interface LevelEngagementData {
  metric: string;
  value: number | string;
  color: string;
  description: string;
}

export default function ProfileInsightsCreatorDashboard({ user, reqUser, timeFilter }: ProfileInsightsCreatorDashboardProps) {
  const { proStatsUser: playLogData, isLoading: isLoadingPlayLog } = useProStatsUser(user, ProStatsUserType.PlayLogForUserCreatedLevels, timeFilter);
  const { proStatsUser: followerData, isLoading: isLoadingFollowers } = useProStatsUser(user, ProStatsUserType.FollowerActivityPatterns, timeFilter);

  // Get user's timezone
  const userTimezone = useMemo(() => {
    const tz = dayjs.tz.guess();
    const abbreviation = dayjs().tz(tz).format('zzz');

    return abbreviation;
  }, []);

  // Get pre-aggregated popularity trends from API
  const { popularityTrends, trendPeriodLabel } = useMemo(() => {
    if (!playLogData || !playLogData[ProStatsUserType.PlayLogForUserCreatedLevels]) {
      return { popularityTrends: [], trendPeriodLabel: 'Activity Trends' };
    }

    const trendData = playLogData[ProStatsUserType.PlayLogForUserCreatedLevels];
    const apiTrends = trendData.popularityTrends || [];

    // Determine label based on time filter
    let label: string;
    let dateFormat: string;

    switch (timeFilter) {
    case '7d':
      label = '7-Day Activity Trends';
      dateFormat = 'ddd'; // Mon, Tue, Wed
      break;
    case '30d':
      label = '30-Day Activity Trends';
      dateFormat = 'MMM DD';
      break;
    case '1y':
      label = 'Weekly Activity Trends (Past Year)';
      dateFormat = 'MMM DD';
      break;
    default:
      label = 'Recent Activity Trends';
      dateFormat = 'MMM DD';
    }

    // Convert API data to chart format
    const data: LevelPopularityData[] = apiTrends
      .map(trend => ({
        date: dayjs(trend.date).format(dateFormat),
        plays: trend.totalSolves,
        uniquePlayers: trend.uniquePlayers,
      }))
      .sort((a, b) => {
        // Sort chronologically
        const dateA = dayjs(a.date, dateFormat);
        const dateB = dayjs(b.date, dateFormat);

        return dateA.isBefore(dateB) ? -1 : dateA.isAfter(dateB) ? 1 : 0;
      });

    return { popularityTrends: data, trendPeriodLabel: label };
  }, [playLogData, timeFilter]);

  // Get pre-aggregated engagement metrics from API
  const engagementMetrics = useMemo(() => {
    const metrics: LevelEngagementData[] = [];

    const metricsData = playLogData?.[ProStatsUserType.PlayLogForUserCreatedLevels];
    const engagementData = metricsData?.engagementMetrics;
    const topSolverData = metricsData?.topSolver;

    // Total solves from pre-aggregated data
    const totalSolves = engagementData?.totalSolves || 0;

    metrics.push({
      metric: 'Total Solves',
      value: totalSolves,
      color: '#3B82F6',
      description: 'Across all your levels',
    });

    // Unique players count from pre-aggregated data
    const uniquePlayersCount = engagementData?.uniquePlayersCount || 0;

    metrics.push({
      metric: 'Unique Players',
      value: uniquePlayersCount,
      color: '#10B981',
      description: 'Different players who solved your levels',
    });

    // Top solver from pre-aggregated data
    metrics.push({
      metric: 'Top Solver',
      value: topSolverData ? `${topSolverData.solveCount} levels` : '0 levels',
      color: '#8B5CF6',
      description: 'Most levels solved by one player',
    });

    return metrics;
  }, [playLogData]);

  // Get pre-aggregated level performance data from API
  const levelPerformance = useMemo(() => {
    if (!playLogData || !playLogData[ProStatsUserType.PlayLogForUserCreatedLevels]) {
      return [];
    }

    const performanceData = playLogData[ProStatsUserType.PlayLogForUserCreatedLevels];
    const apiLevelPerformance = performanceData.levelPerformance || [];

    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

    return apiLevelPerformance
      .slice(0, 5) // Top 5 levels
      .map((level, index) => ({
        name: level.name,
        slug: level.slug,
        plays: level.solveCount,
        uniquePlayers: level.uniquePlayers,
        color: colors[index] || '#6B7280',
      }));
  }, [playLogData]);

  // Analyze tile types used in creator's levels to suggest unused mechanics
  const mechanicSuggestions = useMemo(() => {
    if (!playLogData || !playLogData[ProStatsUserType.PlayLogForUserCreatedLevels]) {
      return { suggestions: [], analysis: { used: [], unused: [], totalCategories: 0 } };
    }

    const performanceData = playLogData[ProStatsUserType.PlayLogForUserCreatedLevels];
    const creatorLevels = performanceData.creatorLevels || [];

    // Collect all tile types used across all levels
    const usedTileTypes = new Set<string>();

    creatorLevels.forEach(level => {
      if (level.data) {
        // Parse the level data to extract tile types
        const levelData = level.data;

        // Check for each tile type character in the level data
        Object.values(TileType).forEach(tileType => {
          if (levelData.includes(tileType)) {
            usedTileTypes.add(tileType);
          }
        });
      }
    });

    // Define interesting mechanics to suggest
    const mechanicCategories = [
      {
        name: 'Holes',
        tiles: [TileType.Hole], // '5'
        tileNames: ['Hole tiles']
      },
      {
        name: 'Directional Movement',
        tiles: [TileType.Left, TileType.Up, TileType.Right, TileType.Down], // '6', '7', '8', '9'
        tileNames: ['Left', 'Up', 'Right', 'Down']
      },
      {
        name: 'Diagonal Movement',
        tiles: [TileType.UpLeft, TileType.UpRight, TileType.DownLeft, TileType.DownRight], // 'A', 'B', 'D', 'C'
        tileNames: ['UpLeft', 'UpRight', 'DownLeft', 'DownRight']
      },
      {
        name: 'Restricted Movement',
        tiles: [TileType.NotLeft, TileType.NotUp, TileType.NotRight, TileType.NotDown], // 'E', 'F', 'G', 'H'
        tileNames: ['NotLeft', 'NotUp', 'NotRight', 'NotDown']
      },
      {
        name: 'Bidirectional Movement',
        tiles: [TileType.LeftRight, TileType.UpDown], // 'I', 'J'
        tileNames: ['LeftRight', 'UpDown']
      }
    ];

    // Find used and unused mechanics
    const usedCategories = mechanicCategories.filter(category => {
      return category.tiles.some(tile => usedTileTypes.has(tile));
    });

    const unusedCategories = mechanicCategories.filter(category => {
      return !category.tiles.some(tile => usedTileTypes.has(tile));
    });

    return {
      suggestions: unusedCategories.slice(0, 3), // Limit to top 3 suggestions
      analysis: {
        used: usedCategories.map(c => c.name),
        unused: unusedCategories.map(c => c.name),
        totalCategories: mechanicCategories.length
      }
    };
  }, [playLogData]);

  // Analyze difficulty range of creator's levels
  const difficultyAnalysis = useMemo(() => {
    if (!playLogData || !playLogData[ProStatsUserType.PlayLogForUserCreatedLevels]) {
      return { suggestions: [], totalLevels: 0, coveredDifficulties: [], missingDifficulties: [] };
    }

    const performanceData = playLogData[ProStatsUserType.PlayLogForUserCreatedLevels];
    const creatorLevels = performanceData.creatorLevels || [];
    const totalLevels = creatorLevels.length;

    // Track which difficulty levels the creator has made levels for
    const coveredDifficulties = new Set<string>();

    creatorLevels.forEach(level => {
      if (level.calc_difficulty_estimate && level.calc_difficulty_estimate > 0) {
        const difficulty = getDifficultyFromEstimate(level.calc_difficulty_estimate);

        if (difficulty.name !== 'Pending') {
          coveredDifficulties.add(difficulty.name);
        }
      }
    });

    // Find missing difficulty levels (excluding Pending)
    const allDifficulties = difficultyList.filter(d => d.name !== 'Pending');
    const missingDifficulties = allDifficulties.filter(d => !coveredDifficulties.has(d.name));

    // Generate suggestions
    const suggestions = [];

    if (totalLevels < 5) {
      suggestions.push({
        category: 'Level Creation',
        suggestion: 'Create more levels to build your portfolio',
        reason: `Only ${totalLevels} published levels`
      });
    }

    // Suggest trying different difficulty levels
    if (missingDifficulties.length > 0) {
      // Prioritize suggesting easier difficulties if they only have hard ones, and vice versa
      const easierDifficulties = missingDifficulties.filter(d => d.value <= 600); // Up to Bachelors
      const harderDifficulties = missingDifficulties.filter(d => d.value > 600); // Masters and above

      if (easierDifficulties.length > 0 && coveredDifficulties.size > 0) {
        const suggestionList = easierDifficulties.slice(0, 3).map(d => `${d.emoji} ${d.name}`).join(', ');

        suggestions.push({
          category: 'Difficulty Exploration',
          suggestion: `Try creating levels for these difficulty ranges: ${suggestionList}`,
          reason: `${user.name} has only made levels for ${coveredDifficulties.size}/${allDifficulties.length} difficulty levels`
        });
      } else if (harderDifficulties.length > 0 && coveredDifficulties.size > 0) {
        const suggestionList = harderDifficulties.slice(0, 3).map(d => `${d.emoji} ${d.name}`).join(', ');

        suggestions.push({
          category: 'Challenge Creation',
          suggestion: `Try creating harder levels: ${suggestionList}`,
          reason: `${user.name} has only made levels for ${coveredDifficulties.size}/${allDifficulties.length} difficulty levels`
        });
      }
    }

    return {
      suggestions,
      totalLevels,
      coveredDifficulties: Array.from(coveredDifficulties),
      missingDifficulties: missingDifficulties.map(d => d.name)
    };
  }, [playLogData, user.name]);

  // Access control - only show for own profile or admin
  const isAdmin = reqUser?.roles?.includes(Role.ADMIN);
  const isOwnProfile = reqUser?._id === user._id;
  const canViewCreatorDashboard = isOwnProfile || isAdmin;

  if (!canViewCreatorDashboard) {
    return (
      <div className='text-center text-lg text-gray-400'>
        <p>Creator dashboard data is only available for your own profile.</p>
      </div>
    );
  }

  const isLoading = isLoadingPlayLog || isLoadingFollowers;

  // Loading components
  const LoadingSkeleton = ({ height = 'h-64' }: { height?: string }) => (
    <div className={`bg-gray-800 rounded-lg animate-pulse ${height}`}>
      <div className='p-4 space-y-2'>
        <div className='h-4 bg-gray-700 rounded w-3/4' />
        <div className='h-4 bg-gray-700 rounded w-1/2' />
        <div className='h-4 bg-gray-700 rounded w-2/3' />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className='flex flex-col gap-6 w-full'>
        {/* Creator Stats Loading */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='bg-gray-800 rounded-lg p-4 animate-pulse'>
              <div className='h-4 bg-gray-700 rounded mb-2' />
              <div className='h-8 bg-gray-700 rounded mb-2' />
              <div className='h-3 bg-gray-700 rounded w-2/3' />
            </div>
          ))}
        </div>
        <LoadingSkeleton height='h-80' />
        <LoadingSkeleton height='h-64' />
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6 w-full'>
      {/* Creator Stats Overview */}
      <div className='flex justify-center'>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl'>
          {engagementMetrics.map((metric, index) => (
            <div key={index} className='bg-gray-800 rounded-lg p-4 text-center'>
              <h3 className='text-sm text-gray-400 mb-1'>{metric.metric}</h3>
              <p className='text-2xl font-bold' style={{ color: metric.color }}>
                {typeof metric.value === 'number' && metric.value > 100
                  ? metric.value.toLocaleString()
                  : metric.value}
                {metric.metric.includes('Rate') && '%'}
              </p>
              <p className='text-xs text-gray-500 mt-1'>{metric.description}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Level Popularity Trends */}
      <div className='flex flex-col gap-2'>
        <h2 className='text-xl font-bold text-center'>{trendPeriodLabel}</h2>
        <p className='text-sm text-gray-400 text-center mb-4'>
          Player engagement with your levels {timeFilter && timeFilter !== 'all' ?
            `over the ${timeFilter === '7d' ? 'last 7 days' : timeFilter === '30d' ? 'last 30 days' : timeFilter === '1y' ? 'past year' : 'selected period'}` :
            'over time'
          }
        </p>
        <div className='w-full h-64'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={popularityTrends} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
              <XAxis
                dataKey='date'
                tick={{ fill: '#9CA3AF' }}
                interval='preserveStartEnd'
              />
              <YAxis tick={{ fill: '#9CA3AF' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(31, 41, 55)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'rgb(229, 231, 235)',
                }}
              />
              <Area
                type='monotone'
                dataKey='plays'
                stackId='1'
                stroke='#3B82F6'
                fill='#3B82F6'
                fillOpacity={0.6}
                name='Total Solves'
              />
              <Area
                type='monotone'
                dataKey='uniquePlayers'
                stackId='2'
                stroke='#10B981'
                fill='#10B981'
                fillOpacity={0.6}
                name='Unique Players'
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Top Performing Levels */}
      <div className='flex flex-col gap-2'>
        <h2 className='text-xl font-bold text-center'>Top Performing Levels</h2>
        <p className='text-sm text-gray-400 text-center mb-4'>
          Your most popular levels by solve count
        </p>
        <div className='w-full h-64'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={levelPerformance} margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
              <XAxis
                dataKey='name'
                angle={-45}
                textAnchor='end'
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis
                tick={{ fill: '#9CA3AF' }}
                label={{ value: 'Play Count', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(31, 41, 55)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'rgb(229, 231, 235)',
                }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length > 0 && payload[0].payload) {
                    const level = payload[0].payload;
                    const completedCount = payload[0].value as number;

                    // Find the corresponding level data to get additional info
                    const tooltipData = playLogData?.[ProStatsUserType.PlayLogForUserCreatedLevels];
                    const creatorLevels = tooltipData?.creatorLevels || [];
                    const levelData = creatorLevels.find(l => l.name === label);
                    const solvedCount = levelData?.calc_stats_completed_count || completedCount;

                    return (
                      <div className='bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-600'>
                        <div className='text-center mb-3'>
                          <h4 className='font-bold text-blue-400 text-lg'>{label}</h4>
                          <div className='w-12 h-0.5 bg-blue-400 mx-auto mt-1' />
                        </div>
                        <div className='space-y-2 text-sm'>
                          <div className='flex items-center justify-between gap-4'>
                            <span className='text-gray-300'>Solves (filtered):</span>
                            <span className='font-bold text-white text-lg'>{completedCount.toLocaleString()}</span>
                          </div>
                          <div className='flex items-center justify-between gap-4'>
                            <span className='text-gray-300'>Total solves:</span>
                            <span className='font-bold text-green-300 text-lg'>{solvedCount.toLocaleString()}</span>
                          </div>
                          <div className='flex items-center justify-between gap-4'>
                            <span className='text-gray-300'>Unique players:</span>
                            <span className='font-semibold text-blue-300'>{level.uniquePlayers}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                }}
              />
              <Bar dataKey='plays' radius={[8, 8, 0, 0]}>
                {levelPerformance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Existing Components */}
      <div className='flex justify-center'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-6xl'>
          <ProfileInsightsLevelPlayLog user={user} timeFilter={timeFilter} />
          <ProfileInsightsMostSolves user={user} timeFilter={timeFilter} />
        </div>
      </div>
      {/* Follower Activity Analysis */}
      {followerData && followerData[ProStatsUserType.FollowerActivityPatterns] && followerData[ProStatsUserType.FollowerActivityPatterns].followerCount >= 5 && <div className='flex flex-col gap-2'>
        <h2 className='text-xl font-bold text-center'>Best Time to Publish</h2>
        <p className='text-sm text-gray-400 text-center mb-4'>
            Optimal timing based on when your {followerData[ProStatsUserType.FollowerActivityPatterns]?.activeFollowerCount} active followers are most engaged
          <span className='block text-xs text-gray-500 mt-1'>
              Analyzing activity patterns from the last 30 days
          </span>
        </p>
        {/* Recommendations */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
          <div className='bg-gray-800 rounded-lg p-4 text-center border-2 border-green-500'>
            <h3 className='text-green-400 font-bold text-lg mb-2'>🕐 Best Time of Day</h3>
            <p className='text-2xl font-bold text-white mb-1'>
              {followerData[ProStatsUserType.FollowerActivityPatterns]?.recommendations.bestTimeLabel}
            </p>
            <p className='text-sm text-gray-400'>
                Peak follower activity time ({userTimezone})
            </p>
          </div>
          <div className='bg-gray-800 rounded-lg p-4 text-center border-2 border-blue-500'>
            <h3 className='text-blue-400 font-bold text-lg mb-2'>📅 Best Day of Week</h3>
            <p className='text-2xl font-bold text-white mb-1'>
              {followerData[ProStatsUserType.FollowerActivityPatterns]?.recommendations.bestDayLabel}
            </p>
            <p className='text-sm text-gray-400'>
                Most active followers online
            </p>
          </div>
        </div>
        {/* Activity Heatmap */}
        <div className='bg-gray-800 rounded-lg p-4'>
          <h4 className='font-bold text-lg mb-3 text-center'>Follower Activity Heatmap ({userTimezone})</h4>
          <p className='text-xs text-gray-400 text-center mb-4'>Darker colors indicate more active followers at that time</p>
          <div className='w-full overflow-x-auto'>
            <div className='min-w-[800px]'>
              {/* Hour labels */}
              <div className='flex'>
                <div className='w-16' /> {/* Space for day labels */}
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourLabels = [
                    '12A', '1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A',
                    '12P', '1P', '2P', '3P', '4P', '5P', '6P', '7P', '8P', '9P', '10P', '11P'
                  ];

                  return (
                    <div key={hour} className='flex-1 text-xs text-gray-400 text-center py-1 min-w-[28px]'>
                      {hourLabels[hour]}
                    </div>
                  );
                })}
              </div>
              {/* Heatmap grid */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayLabel, dayIndex) => {
                const dayOfWeek = dayIndex + 1; // MongoDB uses 1-based indexing

                return (
                  <div key={dayLabel} className='flex items-center'>
                    {/* Day label */}
                    <div className='w-16 text-xs text-gray-400 text-right pr-3 py-1'>
                      {dayLabel}
                    </div>
                    {/* Hour cells for this day */}
                    {Array.from({ length: 24 }, (_, hour) => {
                      // Find the specific day-hour combination data
                      const heatmapEntry = followerData[ProStatsUserType.FollowerActivityPatterns]?.heatmapData?.find(
                        entry => entry.dayOfWeek === dayOfWeek && entry.hour === hour
                      );

                      const activeFollowers = heatmapEntry?.activeFollowers || 0;

                      // Only show data if we have 4+ followers for this specific day-hour combination
                      const hasEnoughData = activeFollowers >= 4;

                      // Calculate opacity based on activity (0 to 1)
                      const maxActivity = Math.max(
                        ...followerData[ProStatsUserType.FollowerActivityPatterns]?.heatmapData?.map(entry => entry.activeFollowers) || [0]
                      );
                      const opacity = hasEnoughData && maxActivity > 0 ? activeFollowers / maxActivity : 0;

                      const hourLabels = [
                        '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
                        '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'
                      ];

                      return (
                        <div
                          key={`${dayLabel}-${hour}`}
                          className='flex-1 aspect-square border border-gray-700 min-w-[28px] min-h-[28px] flex items-center justify-center relative group cursor-pointer'
                          style={{
                            backgroundColor: hasEnoughData ? `rgba(59, 130, 246, ${opacity})` : 'rgba(75, 85, 99, 0.3)',
                          }}
                          title={hasEnoughData
                            ? `${dayLabel} ${hourLabels[hour]}: ${activeFollowers} active followers`
                            : `${dayLabel} ${hourLabels[hour]}: Not enough data (< 4 followers)`
                          }
                        >
                          {/* Tooltip */}
                          <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none'>
                            <div className='font-medium'>{dayLabel} {hourLabels[hour]}</div>
                            <div className='text-gray-300'>
                              {hasEnoughData
                                ? `${activeFollowers} active followers`
                                : 'Not enough data (< 4 followers)'
                              }
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {/* Legend */}
              <div className='flex items-center justify-center mt-4 space-x-4'>
                <div className='flex items-center space-x-2'>
                  <div className='w-4 h-4 bg-gray-600 border border-gray-700' />
                  <span className='text-xs text-gray-400'>No data</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='w-4 h-4 border border-gray-700' style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)' }} />
                  <span className='text-xs text-gray-400'>Low activity</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='w-4 h-4 border border-gray-700' style={{ backgroundColor: 'rgba(59, 130, 246, 0.7)' }} />
                  <span className='text-xs text-gray-400'>High activity</span>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='w-4 h-4 bg-blue-500 border border-gray-700' />
                  <span className='text-xs text-gray-400'>Peak activity</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>}
      {/* Creator Insights */}
      <div className='bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-lg'>
        <div className='flex items-center gap-3 mb-6'>
          <div className='w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center'>
            <span className='text-xl'>🚀</span>
          </div>
          <div>
            <h3 className='text-xl font-bold text-white'>Creator Insights</h3>
            <p className='text-sm text-gray-400'>Insights about levels {user.name} has created</p>
          </div>
        </div>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* What's Working Well */}
          <div className='bg-gradient-to-br from-green-900/30 to-emerald-900/20 rounded-lg p-4 border border-green-500/20'>
            <div className='flex items-center gap-2 mb-4'>
              <div className='w-6 h-6 bg-green-500 rounded-full flex items-center justify-center'>
                <span className='text-xs'>✓</span>
              </div>
              <h4 className='font-bold text-green-400 text-lg'>What&apos;s Working Well</h4>
            </div>
            <div className='space-y-3'>
              {engagementMetrics[0] && typeof engagementMetrics[0].value === 'number' && engagementMetrics[0].value > 50 && (
                <div className='flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border-l-4 border-green-500'>
                  <span className='text-green-400 text-lg'>📈</span>
                  <div>
                    <p className='text-white font-medium'>Strong Engagement</p>
                    <p className='text-sm text-gray-300'>{engagementMetrics[0].value.toLocaleString()} total solves across your levels</p>
                  </div>
                </div>
              )}
              {engagementMetrics[1] && typeof engagementMetrics[1].value === 'number' && engagementMetrics[1].value > 10 && (
                <div className='flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border-l-4 border-green-500'>
                  <span className='text-green-400 text-lg'>👥</span>
                  <div>
                    <p className='text-white font-medium'>Great Reach</p>
                    <p className='text-sm text-gray-300'>{engagementMetrics[1].value} unique players have enjoyed your content</p>
                  </div>
                </div>
              )}
              {engagementMetrics[2] && typeof engagementMetrics[2].value === 'string' && engagementMetrics[2].value.includes('levels') && (
                <div className='flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border-l-4 border-green-500'>
                  <span className='text-green-400 text-lg'>🏆</span>
                  <div>
                    <p className='text-white font-medium'>Dedicated Fans</p>
                    <p className='text-sm text-gray-300'>Your top solver has completed {engagementMetrics[2].value}</p>
                  </div>
                </div>
              )}
              {levelPerformance.length > 0 && (
                <div className='flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border-l-4 border-green-500'>
                  <span className='text-green-400 text-lg'>⭐</span>
                  <div>
                    <p className='text-white font-medium'>Popular Content</p>
                    <p className='text-sm text-gray-300'>&quot;{levelPerformance[0].name}&quot; has {levelPerformance[0].plays} completions</p>
                  </div>
                </div>
              )}
              {/* Discord Connection */}
              {followerData && followerData[ProStatsUserType.FollowerActivityPatterns] && followerData[ProStatsUserType.FollowerActivityPatterns].hasDiscordConnected && (
                <div className='flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border-l-4 border-green-500'>
                  <span className='text-green-400 text-lg'>💬</span>
                  <div>
                    <p className='text-white font-medium'>Discord Connected</p>
                    <p className='text-sm text-gray-300'>You can engage with your community directly through Discord</p>
                  </div>
                </div>
              )}
              {/* Difficulty Distribution */}
              {(() => {
                const performanceData = playLogData?.[ProStatsUserType.PlayLogForUserCreatedLevels];
                const creatorLevels = performanceData?.creatorLevels || [];
                const difficultyCategories = new Set<string>();
                
                creatorLevels.forEach(level => {
                  if (level.calc_difficulty_estimate !== undefined) {
                    const difficulty = level.calc_difficulty_estimate;
                    if (difficulty < 500) difficultyCategories.add('Easy');
                    else if (difficulty < 1000) difficultyCategories.add('Medium');
                    else if (difficulty < 1500) difficultyCategories.add('Hard');
                    else if (difficulty < 2000) difficultyCategories.add('Expert');
                    else difficultyCategories.add('Master');
                  }
                });
                
                const hasGoodVariety = difficultyCategories.size >= 3;
                const hasAllDifficulties = difficultyCategories.size === 5;
                
                if (hasGoodVariety) {
                  return (
                    <div className='flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border-l-4 border-green-500'>
                      <span className='text-green-400 text-lg'>🎯</span>
                      <div>
                        <p className='text-white font-medium'>
                          {hasAllDifficulties ? 'Complete Difficulty Range' : 'Good Difficulty Variety'}
                        </p>
                        <p className='text-sm text-gray-300'>
                          {hasAllDifficulties 
                            ? 'Your levels span all difficulty tiers, appealing to players of all skill levels'
                            : `Your levels cover ${difficultyCategories.size} different difficulty tiers`}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              {followerData && followerData[ProStatsUserType.FollowerActivityPatterns] && followerData[ProStatsUserType.FollowerActivityPatterns].activeFollowerCount > 0 && (
                <div className='flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border-l-4 border-green-500'>
                  <span className='text-green-400 text-lg'>💫</span>
                  <div>
                    <p className='text-white font-medium'>Active Community</p>
                    <p className='text-sm text-gray-300'>{followerData[ProStatsUserType.FollowerActivityPatterns].activeFollowerCount} followers actively playing in the last 30 days</p>
                  </div>
                </div>
              )}
              {/* Mechanic mastery - moved from Growth Opportunities */}
              {mechanicSuggestions.suggestions.length === 0 && mechanicSuggestions.analysis.used.length >= 4 && (
                <div className='flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border-l-4 border-green-500'>
                  <span className='text-green-400 text-lg'>🏆</span>
                  <div>
                    <p className='text-white font-medium'>Mechanic Master</p>
                    <p className='text-sm text-gray-300'>{user.name} has experimented with {mechanicSuggestions.analysis.used.length}/{mechanicSuggestions.analysis.totalCategories} different tile types</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Growth Opportunities */}
          <div className='bg-gradient-to-br from-amber-900/30 to-orange-900/20 rounded-lg p-4 border border-amber-500/20'>
            <div className='flex items-center gap-2 mb-4'>
              <div className='w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center'>
                <span className='text-xs'>💡</span>
              </div>
              <h4 className='font-bold text-amber-400 text-lg'>Growth Opportunities</h4>
            </div>
            <div className='space-y-3'>
              {/* Difficulty and creation analysis */}
              {difficultyAnalysis.suggestions.map((suggestion, index) => (
                <div key={index} className='flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border-l-4 border-amber-500'>
                  <span className='text-amber-400 text-lg'>
                    {suggestion.category === 'Level Creation' ? '📝' :
                      suggestion.category === 'Difficulty Balance' ? '⚖️' : '🏔️'}
                  </span>
                  <div>
                    <p className='text-white font-medium'>{suggestion.category}</p>
                    <p className='text-sm text-gray-300'>{suggestion.suggestion}</p>
                    <p className='text-xs text-gray-500 mt-1'>📊 {suggestion.reason}</p>
                  </div>
                </div>
              ))}
              {/* Engagement-based suggestions */}
              {engagementMetrics[0] && typeof engagementMetrics[0].value === 'number' && engagementMetrics[0].value < 10 && (
                <div className='flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border-l-4 border-amber-500'>
                  <span className='text-amber-400 text-lg'>📢</span>
                  <div>
                    <p className='text-white font-medium'>Boost Visibility</p>
                    <p className='text-sm text-gray-300'>Consider sharing your levels on social media or community forums</p>
                    <p className='text-xs text-gray-500 mt-1'>⚠️ {user.name}&apos;s levels have only {engagementMetrics[0].value} total solves</p>
                  </div>
                </div>
              )}
              {engagementMetrics[1] && typeof engagementMetrics[1].value === 'number' && engagementMetrics[1].value < 5 && (
                <div className='flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border-l-4 border-amber-500'>
                  <span className='text-amber-400 text-lg'>🎯</span>
                  <div>
                    <p className='text-white font-medium'>Expand Your Audience</p>
                    <p className='text-sm text-gray-300'>Try creating levels with different difficulty ranges</p>
                    <p className='text-xs text-gray-500 mt-1'>📊 Only {engagementMetrics[1].value} unique players have tried {user.name}&apos;s levels</p>
                  </div>
                </div>
              )}
              {mechanicSuggestions.suggestions.length > 0 && (
                <div className='flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border-l-4 border-amber-500'>
                  <span className='text-amber-400 text-lg'>🔧</span>
                  <div>
                    <p className='text-white font-medium'>Try New Tile Types</p>
                    <p className='text-sm text-gray-300 mb-2'>{user.name} hasn&apos;t used these tile types yet:</p>
                    <div className='text-xs text-gray-400 space-y-1'>
                      {mechanicSuggestions.suggestions.map((suggestion, index) => (
                        <div key={index} className='flex items-start gap-1'>
                          <span className='text-amber-400 mt-0.5'>•</span>
                          <span><span className='text-amber-300 font-medium'>{suggestion.name}</span>: {suggestion.tileNames.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                    <p className='text-xs text-gray-500 mt-2'>
                      🔍 Analysis found: {user.name} uses {mechanicSuggestions.analysis.used.length}/{mechanicSuggestions.analysis.totalCategories} tile type categories
                      {mechanicSuggestions.analysis.used.length > 0 && (
                        <span className='block mt-1'>
                          ✅ Currently using: {mechanicSuggestions.analysis.used.join(', ')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
              {/* Difficulty variety suggestion */}
              {(() => {
                const performanceData = playLogData?.[ProStatsUserType.PlayLogForUserCreatedLevels];
                const creatorLevels = performanceData?.creatorLevels || [];
                const difficultyCategories = new Set<string>();
                
                creatorLevels.forEach(level => {
                  if (level.calc_difficulty_estimate !== undefined) {
                    const difficulty = level.calc_difficulty_estimate;
                    if (difficulty < 500) difficultyCategories.add('Easy');
                    else if (difficulty < 1000) difficultyCategories.add('Medium');
                    else if (difficulty < 1500) difficultyCategories.add('Hard');
                    else if (difficulty < 2000) difficultyCategories.add('Expert');
                    else difficultyCategories.add('Master');
                  }
                });
                
                const hasGoodVariety = difficultyCategories.size >= 3;
                const missingDifficulties = ['Easy', 'Medium', 'Hard', 'Expert', 'Master'].filter(d => !difficultyCategories.has(d));
                
                if (!hasGoodVariety && creatorLevels.length > 0) {
                  return (
                    <div className='flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border-l-4 border-amber-500'>
                      <span className='text-amber-400 text-lg'>🎯</span>
                      <div>
                        <p className='text-white font-medium'>Expand Difficulty Range</p>
                        <p className='text-sm text-gray-300'>
                          Consider creating levels at different difficulty tiers to appeal to a wider audience
                        </p>
                        <p className='text-xs text-gray-500 mt-1'>
                          💡 Try creating {missingDifficulties.slice(0, 2).join(' and ')} levels to diversify your portfolio
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              {(!followerData || !followerData[ProStatsUserType.FollowerActivityPatterns] || !followerData[ProStatsUserType.FollowerActivityPatterns].hasDiscordConnected) && (
                <div className='flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border-l-4 border-amber-500'>
                  <span className='text-amber-400 text-lg'>💬</span>
                  <div>
                    <p className='text-white font-medium'>Connect Discord for Community Engagement</p>
                    <p className='text-sm text-gray-300'>Connect your Discord account to engage with the community and share your levels</p>
                    <p className='text-xs text-gray-500 mt-1'>
                      🔗 Connect Discord from your account settings •
                      <a href='https://discord.gg/j6RxRdqq4A' target='_blank' rel='noopener noreferrer' className='text-blue-400 hover:text-blue-300 ml-1'>
                        Join our Discord
                      </a> if you haven&apos;t already
                    </p>
                  </div>
                </div>
              )}
              {followerData && followerData[ProStatsUserType.FollowerActivityPatterns] && followerData[ProStatsUserType.FollowerActivityPatterns].followerCount >= 5 && (
                <div className='flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border-l-4 border-amber-500'>
                  <span className='text-amber-400 text-lg'>⏰</span>
                  <div>
                    <p className='text-white font-medium'>Optimal Timing</p>
                    <p className='text-sm text-gray-300'>Publish levels on {followerData[ProStatsUserType.FollowerActivityPatterns]?.recommendations.bestDayLabel}s around {followerData[ProStatsUserType.FollowerActivityPatterns]?.recommendations.bestTimeLabel} for maximum engagement</p>
                    <p className='text-xs text-gray-500 mt-1'>📊 Based on activity patterns of your {followerData[ProStatsUserType.FollowerActivityPatterns]?.activeFollowerCount} active followers</p>
                  </div>
                </div>
              )}
              {(!followerData || !followerData[ProStatsUserType.FollowerActivityPatterns] || followerData[ProStatsUserType.FollowerActivityPatterns].followerCount < 5) && (
                <div className='flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border-l-4 border-amber-500'>
                  <span className='text-amber-400 text-lg'>👥</span>
                  <div>
                    <p className='text-white font-medium'>Build Your Following</p>
                    <p className='text-sm text-gray-300'>Gain followers to unlock personalized publishing time recommendations</p>
                    <p className='text-xs text-gray-500 mt-1'>🎯 You currently have {followerData?.[ProStatsUserType.FollowerActivityPatterns]?.followerCount || 0} followers (need 5+ for timing analysis)</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Bottom Stats Bar */}
        <div className='mt-6 pt-4 border-t border-gray-700'>
          <div className='flex flex-wrap items-center justify-center gap-6 text-sm'>
            <div className='flex items-center gap-2'>
              <div className='w-3 h-3 bg-blue-500 rounded-full' />
              <span className='text-gray-400'>Total Solves: <span className='text-white font-medium'>{engagementMetrics[0]?.value || 0}</span></span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-3 h-3 bg-green-500 rounded-full' />
              <span className='text-gray-400'>Unique Players: <span className='text-white font-medium'>{engagementMetrics[1]?.value || 0}</span></span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-3 h-3 bg-purple-500 rounded-full' />
              <span className='text-gray-400'>Published Levels: <span className='text-white font-medium'>{levelPerformance.length}</span></span>
            </div>
            {followerData && followerData[ProStatsUserType.FollowerActivityPatterns] && (
              <div className='flex items-center gap-2'>
                <div className='w-3 h-3 bg-yellow-500 rounded-full' />
                <span className='text-gray-400'>Followers: <span className='text-white font-medium'>{followerData[ProStatsUserType.FollowerActivityPatterns].followerCount}</span></span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
