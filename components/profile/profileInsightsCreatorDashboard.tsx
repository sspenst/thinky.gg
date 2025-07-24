import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import User from '../../models/db/user';
import { TimeFilter } from './profileInsights';
import ProfileInsightsLevelPlayLog from './profileInsightsLevelPlayLog';
import ProfileInsightsMostSolves from './profileInsightsMostSolves';

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

export default function ProfileInsightsCreatorDashboard({ user, reqUser: _reqUser, timeFilter }: ProfileInsightsCreatorDashboardProps) {
  const { proStatsUser: playLogData, isLoading: isLoadingPlayLog } = useProStatsUser(user, ProStatsUserType.PlayLogForUserCreatedLevels, timeFilter);
  const { proStatsUser: solvesData, isLoading: isLoadingSolves } = useProStatsUser(user, ProStatsUserType.MostSolvesForUserLevels, timeFilter);

  // Calculate level popularity trends based on real data
  const { popularityTrends, trendPeriodLabel } = useMemo(() => {
    if (!playLogData || !playLogData[ProStatsUserType.PlayLogForUserCreatedLevels]) {
      return { popularityTrends: [], trendPeriodLabel: 'Activity Trends' };
    }

    const trendData = playLogData[ProStatsUserType.PlayLogForUserCreatedLevels];
    const playLog = trendData.playLog as Array<{
      statTs: number;
      user: { _id: string } | null;
      levelId: any;
    }>;

    // Determine grouping and label based on time filter
    let label: string;
    let dateFormat: string;
    let groupBy: 'day' | 'week';

    switch (timeFilter) {
    case '7d':
      label = '7-Day Activity Trends';
      dateFormat = 'ddd'; // Mon, Tue, Wed
      groupBy = 'day';
      break;
    case '30d':
      label = '30-Day Activity Trends';
      dateFormat = 'MMM DD';
      groupBy = 'day';
      break;
    case '1y':
      label = 'Weekly Activity Trends (Past Year)';
      dateFormat = 'MMM DD';
      groupBy = 'week';
      break;
    default:
      label = 'Recent Activity Trends';
      dateFormat = 'MMM DD';
      groupBy = 'day';
    }

    // Group play log data by time period (note: this counts solves, not total attempts)
    const grouped: { [key: string]: { plays: number; uniqueUsers: Set<string> } } = {};

    playLog.forEach(entry => {
      const date = dayjs(entry.statTs * 1000);
      const key = groupBy === 'week'
        ? date.startOf('week').format(dateFormat)
        : date.format(dateFormat);

      if (!grouped[key]) {
        grouped[key] = { plays: 0, uniqueUsers: new Set() };
      }

      grouped[key].plays++;

      if (entry.user?._id) {
        grouped[key].uniqueUsers.add(entry.user._id);
      }
    });

    // Convert to array format for chart
    const data: LevelPopularityData[] = Object.entries(grouped)
      .map(([date, stats]) => ({
        date,
        plays: stats.plays,
        uniquePlayers: stats.uniqueUsers.size,
      }))
      .sort((a, b) => {
        // Sort chronologically
        const dateA = dayjs(a.date, dateFormat);
        const dateB = dayjs(b.date, dateFormat);

        return dateA.isBefore(dateB) ? -1 : dateA.isAfter(dateB) ? 1 : 0;
      });

    return { popularityTrends: data, trendPeriodLabel: label };
  }, [playLogData, timeFilter]);

  // Calculate real engagement metrics from data
  const engagementMetrics = useMemo(() => {
    const metrics: LevelEngagementData[] = [];

    const metricsData = playLogData?.[ProStatsUserType.PlayLogForUserCreatedLevels];
    const playLog = metricsData?.playLog as Array<{
      statTs: number;
      user: { _id: string } | null;
      levelId: any;
    }> || [];
    const creatorLevels = metricsData?.creatorLevels || [];

    const solvesDataArray = solvesData?.[ProStatsUserType.MostSolvesForUserLevels] as Array<{
      sum: number;
      user: any;
    }> || [];

    // Total solves from play log
    const totalSolves = playLog.length;

    metrics.push({
      metric: 'Total Solves',
      value: totalSolves,
      color: '#3B82F6',
      description: 'Across all your levels',
    });

    // Unique players count
    const uniquePlayerIds = new Set(
      playLog
        .map(p => p.user?._id)
        .filter(Boolean)
    );

    metrics.push({
      metric: 'Unique Players',
      value: uniquePlayerIds.size,
      color: '#10B981',
      description: 'Different players who solved your levels',
    });

    // Most active solver
    const topSolver = solvesDataArray[0];

    metrics.push({
      metric: 'Top Solver',
      value: topSolver ? `${topSolver.sum} levels` : '0 levels',
      color: '#8B5CF6',
      description: 'Most levels solved by one player',
    });

    return metrics;
  }, [playLogData, solvesData]);

  // Level performance breakdown using schema data
  const levelPerformance = useMemo(() => {
    if (!playLogData || !playLogData[ProStatsUserType.PlayLogForUserCreatedLevels]) {
      return [];
    }

    const performanceData = playLogData[ProStatsUserType.PlayLogForUserCreatedLevels];
    const creatorLevels = performanceData.creatorLevels || [];

    // Use the schema data directly instead of complex calculations
    const levels = creatorLevels
      .map(level => ({
        name: level.name,
        slug: level.slug,
        plays: level.calc_stats_completed_count,
        uniquePlayers: level.calc_playattempts_unique_users?.length || 0,
      }))
      .filter(level => level.plays > 0) // Only show levels with solves
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 5); // Top 5 levels

    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

    return levels.map((level, index) => ({
      ...level,
      color: colors[index] || '#6B7280',
    }));
  }, [playLogData]);

  const isLoading = isLoadingPlayLog || isLoadingSolves;

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
                            <span className='text-gray-300'>Completed:</span>
                            <span className='font-bold text-white text-lg'>{completedCount.toLocaleString()}</span>
                          </div>
                          <div className='flex items-center justify-between gap-4'>
                            <span className='text-gray-300'>Solved:</span>
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
      {/* Creator Tips */}
      <div className='bg-gray-800 rounded-lg p-6'>
        <h3 className='text-lg font-bold mb-4'>Creator Insights</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
          <div>
            <h4 className='font-semibold text-blue-400 mb-2'>What&apos;s Working Well</h4>
            <ul className='space-y-1 text-gray-300'>
              {engagementMetrics[0] && typeof engagementMetrics[0].value === 'number' && engagementMetrics[0].value > 50 && <li>• Strong level activity with {engagementMetrics[0].value} total plays</li>}
              {engagementMetrics[1] && typeof engagementMetrics[1].value === 'number' && engagementMetrics[1].value > 10 && <li>• Good reach with {engagementMetrics[1].value} unique players</li>}
              {engagementMetrics[2] && typeof engagementMetrics[2].value === 'string' && engagementMetrics[2].value.includes('levels') && <li>• Top solver is very engaged with {engagementMetrics[2].value}</li>}
              {levelPerformance.length > 0 && <li>• Your most popular level has {levelPerformance[0].plays} plays</li>}
            </ul>
          </div>
          <div>
            <h4 className='font-semibold text-yellow-400 mb-2'>Areas to Explore</h4>
            <ul className='space-y-1 text-gray-300'>
              {engagementMetrics[0] && typeof engagementMetrics[0].value === 'number' && engagementMetrics[0].value < 10 && <li>• Consider promoting your levels to increase visibility</li>}
              {engagementMetrics[1] && typeof engagementMetrics[1].value === 'number' && engagementMetrics[1].value < 5 && <li>• Try different difficulty levels to reach more players</li>}
              {levelPerformance.length > 0 && levelPerformance[0].engagement < 50 && <li>• Focus on levels that encourage repeat attempts</li>}
              <li>• Experiment with different puzzle mechanics</li>
              <li>• Engage with player feedback in comments</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
