import Role from '@root/constants/role';
import { DateAndSum } from '@root/contexts/levelContext';
import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import dayjs from 'dayjs';
import { Moon, Star, Sun, Sunrise, Sunset } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, Cell, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import User from '../../models/db/user';
import { difficultyList, getDifficultyFromEstimate } from '../formatted/formattedDifficulty';
import { TimeFilter } from './profileInsights';

interface ProfileInsightsTimeAnalyticsProps {
  user: User;
  reqUser: User | null;
  timeFilter: TimeFilter;
}


interface TimeInvestmentData {
  difficulty: string;
  totalTime: number;
  levelCount: number;
  avgTimePerLevel: number;
  color: string;
  thresholdTime: number;
  userAvgPerLevel: number;
  avgTimePerLevelSeconds: number;
  sortOrder: number;
  difficultyIndex: number;
  percentageDelta: number;
  userColor: string;
}

// Helper function to format duration intelligently
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  } else if (minutes < 1440) { // Less than 24 hours
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  } else if (minutes < 43200) { // Less than 30 days
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);

    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  } else { // More than 30 days
    const months = Math.floor(minutes / 43200);
    const remainingDays = Math.floor((minutes % 43200) / 1440);

    return remainingDays > 0 ? `${months}mo ${remainingDays}d` : `${months}mo`;
  }
}

// Helper function to format time per level (seconds or minutes)
function formatTimePerLevel(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  } else {
    const minutes = Math.round(seconds / 60);

    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  }
}

export default function ProfileInsightsTimeAnalytics({ user, reqUser, timeFilter }: ProfileInsightsTimeAnalyticsProps) {
  const { proStatsUser: scoreHistory, isLoading: isLoadingScoreHistory } = useProStatsUser(user, ProStatsUserType.ScoreHistory, timeFilter);
  const { proStatsUser: difficultyData, isLoading: isLoadingDifficulty } = useProStatsUser(user, ProStatsUserType.DifficultyLevelsComparisons, timeFilter);


  // Calculate activity heatmap data
  const activityHeatmap = useMemo(() => {
    if (!scoreHistory || !scoreHistory[ProStatsUserType.ScoreHistory]) {
      return [];
    }

    const history = scoreHistory[ProStatsUserType.ScoreHistory] as DateAndSum[];

    if (!history || history.length === 0) {
      return [];
    }

    // Since we only have daily data, we'll create a day-of-week activity view
    const dayActivityData: { [key: string]: number } = {};
    const totalByDay: { [key: string]: number } = {};

    // Aggregate activity by day of week
    history.forEach(entry => {
      const date = dayjs(entry.date);
      const dayOfWeek = date.format('ddd');
      const count = entry.sum;

      dayActivityData[dayOfWeek] = (dayActivityData[dayOfWeek] || 0) + count;
      totalByDay[dayOfWeek] = (totalByDay[dayOfWeek] || 0) + 1;
    });

    // Convert to average activity per day
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const avgByDay: { [key: string]: number } = {};

    days.forEach(day => {
      if (totalByDay[day] > 0) {
        avgByDay[day] = dayActivityData[day] / totalByDay[day];
      } else {
        avgByDay[day] = 0;
      }
    });

    // Since we don't have hourly data, show daily averages in a simpler format
    return days.map(day => ({
      day,
      avgSolves: avgByDay[day] || 0,
      totalSolves: dayActivityData[day] || 0,
      daysActive: totalByDay[day] || 0,
    }));
  }, [scoreHistory]);

  // Calculate time investment by difficulty with threshold data
  const timeInvestmentData = useMemo(() => {
    if (!difficultyData || !difficultyData[ProStatsUserType.DifficultyLevelsComparisons]) {
      return [];
    }

    const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as Array<{
      difficulty: number;
      myPlayattemptsSumDuration: number;
      otherPlayattemptsAverageDuration?: number;
    }>;
    const difficultyGroups = new Map<string, {
      totalTime: number,
      count: number,
      maxDiff: number,
      totalOtherTime: number,
      otherCount: number
    }>();

    comparisons.forEach(c => {
      if (!c.difficulty || !c.myPlayattemptsSumDuration) return;

      const difficulty = getDifficultyFromEstimate(c.difficulty);
      const group = difficultyGroups.get(difficulty.name) || {
        totalTime: 0,
        count: 0,
        maxDiff: 0,
        totalOtherTime: 0,
        otherCount: 0
      };

      group.totalTime += c.myPlayattemptsSumDuration;
      group.count++;
      group.maxDiff = Math.max(group.maxDiff, c.difficulty);

      // Only track community average for the SAME levels the user solved
      if (c.otherPlayattemptsAverageDuration) {
        group.totalOtherTime += c.otherPlayattemptsAverageDuration;
        group.otherCount++;
      }

      difficultyGroups.set(difficulty.name, group);
    });

    // Convert to chart data using difficulty order from constants - ALWAYS include all difficulties
    // Sort by difficulty value to ensure proper order (Kindergarten -> Super Grandmaster)
    const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#DC2626', '#991B1B', '#6B7280', '#374151'];
    const orderedData = difficultyList
      .filter(d => d.name !== 'Pending')
      .sort((a, b) => a.value - b.value) // Sort by difficulty value ascending
      .map((d, index) => {
        const group = difficultyGroups.get(d.name);

        if (group && group.count >= 7) {
          // User has data for this difficulty
          const userAvgPerLevel = Math.max(0.1, Math.round((group.totalTime / group.count) / 60 * 100) / 100); // User's avg per level in minutes, min 0.1
          const communityAvgPerLevel = group.otherCount > 0
            ? Math.max(0.1, Math.round((group.totalOtherTime / group.otherCount) / 60 * 100) / 100) // Community avg per level in minutes, min 0.1
            : Math.max(0.1, userAvgPerLevel * 0.8); // Default to slightly below user avg for comparison

          // Calculate percentage difference from community average (invert so faster = positive, slower = negative)
          const percentageDelta = ((communityAvgPerLevel - userAvgPerLevel) / communityAvgPerLevel) * 100;
          const userColor = percentageDelta > 0 ? '#10B981' : '#EF4444'; // Green if faster (positive), red if slower (negative)

          // Keep the actual positive/negative values for the chart
          const roundedDelta = Math.round(percentageDelta);

          return {
            difficulty: d.name,
            difficultyIndex: index, // Use index for X-axis ordering
            totalTime: Math.round(group.totalTime / 60), // Convert to minutes
            levelCount: group.count,
            avgTimePerLevel: userAvgPerLevel, // User's avg per level in minutes for chart
            avgTimePerLevelSeconds: Math.round(group.totalTime / group.count), // Keep in seconds for tooltip display
            thresholdTime: communityAvgPerLevel, // Community average time per level
            userAvgPerLevel: userAvgPerLevel, // User's average time per level for comparison
            percentageDelta: roundedDelta, // Rounded percentage difference for chart (positive = faster, negative = slower)
            color: colors[index % colors.length],
            userColor: userColor, // Performance-based color for user bar
            sortOrder: d.value, // Add explicit sort order based on difficulty value
          };
        }

        // Skip difficulties with less than 7 solves
        return null;
      })
      .filter(Boolean) as (TimeInvestmentData & { thresholdTime: number; userAvgPerLevel: number; avgTimePerLevelSeconds: number; sortOrder: number; difficultyIndex: number; percentageDelta: number })[];

    // Final sort to ensure proper order is maintained
    return orderedData.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [difficultyData]);

  // Calculate min/max values for centered Y-axis domain
  const yAxisDomain = useMemo(() => {
    if (!timeInvestmentData.length) return [-50, 50];

    const allDeltas = timeInvestmentData.map(d => d.percentageDelta).filter(v => v !== 0);

    if (allDeltas.length === 0) return [-50, 50];

    const min = Math.min(...allDeltas);
    const max = Math.max(...allDeltas);

    // Make sure 0 is centered by using the larger absolute value for both bounds
    const maxAbsValue = Math.max(Math.abs(min), Math.abs(max));
    const padding = maxAbsValue * 0.2; // 20% padding
    const bound = Math.ceil(maxAbsValue + padding);

    return [-bound, bound];
  }, [timeInvestmentData]);

  // Calculate peak performance days
  const peakDays = useMemo(() => {
    if (!activityHeatmap || activityHeatmap.length === 0) return [];

    return [...activityHeatmap]
      .sort((a, b) => b.avgSolves - a.avgSolves)
      .slice(0, 3)
      .filter(d => d.avgSolves > 0)
      .map(d => d.day);
  }, [activityHeatmap]);


  // Time-of-day performance analysis with hourly data for clock visualization
  const timeOfDayPerformance = useMemo(() => {
    if (!difficultyData || !difficultyData[ProStatsUserType.DifficultyLevelsComparisons]) {
      return null;
    }

    const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as Array<{
      ts: number;
      myPlayattemptsSumDuration: number;
      otherPlayattemptsAverageDuration: number;
    }>;
    const validComparisons = comparisons.filter(c =>
      c.myPlayattemptsSumDuration && c.otherPlayattemptsAverageDuration && c.ts
    );

    if (validComparisons.length === 0) return null;

    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Calculate user's overall average performance ratio
    const overallAvgRatio = validComparisons.reduce((sum, c) =>
      sum + (c.otherPlayattemptsAverageDuration / c.myPlayattemptsSumDuration), 0
    ) / validComparisons.length;

    // Initialize hourly data
    const hourlyData: { [hour: number]: { sumRatio: number, count: number } } = {};

    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { sumRatio: 0, count: 0 };
    }

    // Group by hour
    validComparisons.forEach(c => {
      const date = new Date(c.ts * 1000);
      const hour = date.getHours();
      const performanceRatio = c.otherPlayattemptsAverageDuration / c.myPlayattemptsSumDuration;

      hourlyData[hour].count++;
      hourlyData[hour].sumRatio += performanceRatio;
    });

    // Create clock data (5 natural time periods)
    const clockData: { 
      period: string; 
      sublabel: string; 
      periodNum: number;
      icon: React.ComponentType<{ size?: number }>;
      performance: number;
      relativePerformance: number;
      levelCount: number;
      color: string;
      hasData: boolean;
      fullMark: number;
    }[] = [];
    let bestPeriod = -1;
    let bestPerformance = -Infinity;
    let worstPeriod = -1;
    let worstPerformance = Infinity;

    // Define natural time periods with icons
    const periods = [
      { start: 0, end: 5, label: 'Late Night', sublabel: '12AM-6AM', position: 0, icon: Moon },
      { start: 6, end: 11, label: 'Morning', sublabel: '6AM-12PM', position: 1, icon: Sunrise },
      { start: 12, end: 16, label: 'Afternoon', sublabel: '12PM-5PM', position: 2, icon: Sun },
      { start: 17, end: 20, label: 'Evening', sublabel: '5PM-9PM', position: 3, icon: Sunset },
      { start: 21, end: 23, label: 'Night', sublabel: '9PM-12AM', position: 4, icon: Star },
    ];

    periods.forEach((period) => {
      let totalRatio = 0;
      let totalCount = 0;

      // Aggregate data for this 3-hour period
      for (let hour = period.start; hour <= period.end; hour++) {
        const data = hourlyData[hour];

        if (data.count > 0) {
          totalRatio += data.sumRatio;
          totalCount += data.count;
        }
      }

      let performance = 50; // Default to middle (no data)
      let relativePerformance = 0;
      let color = '#374151'; // Dark gray for no data
      let hasData = false;

      if (totalCount > 0) {
        hasData = true;
        const avgRatio = totalRatio / totalCount;

        relativePerformance = (avgRatio / overallAvgRatio - 1) * 100;
        // Scale to 0-100 for radar chart (50 is average)
        performance = Math.max(0, Math.min(100, 50 + relativePerformance));

        // Track best/worst periods
        if (relativePerformance > bestPerformance) {
          bestPerformance = relativePerformance;
          bestPeriod = period.position;
        }

        if (relativePerformance < worstPerformance) {
          worstPerformance = relativePerformance;
          worstPeriod = period.position;
        }

        // Color based on performance
        if (relativePerformance > 10) color = '#10B981'; // Green
        else if (relativePerformance > 5) color = '#22C55E';
        else if (relativePerformance > 0) color = '#84CC16';
        else if (relativePerformance > -5) color = '#F59E0B';
        else if (relativePerformance > -10) color = '#F97316';
        else color = '#DC2626'; // Red
      }

      clockData.push({
        period: period.label,
        sublabel: period.sublabel,
        periodNum: period.position,
        icon: period.icon,
        performance,
        relativePerformance,
        levelCount: totalCount,
        color,
        hasData,
        fullMark: 100,
      });
    });

    return {
      clockData,
      timezone: userTimezone,
      overallAverage: overallAvgRatio,
      bestPeriod,
      worstPeriod,
      hasData: validComparisons.length > 0,
    };
  }, [difficultyData]);

  const isLoading = isLoadingScoreHistory || isLoadingDifficulty;

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
        <LoadingSkeleton height='h-80' />
        <LoadingSkeleton height='h-64' />
        <LoadingSkeleton height='h-64' />
        <LoadingSkeleton height='h-64' />
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <LoadingSkeleton height='h-32' />
          <LoadingSkeleton height='h-32' />
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6 w-full'>
      {/* Time Investment by Difficulty */}
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-center mb-2'>
          <h2 className='text-xl font-bold'>Performance vs Community Average</h2>
        </div>
        <p className='text-sm text-gray-400 text-center mb-2'>
          How much faster (+) or slower (-) you are compared to other players on the same levels
          <span className='block text-xs text-gray-500 mt-1'>
            Only shows difficulty tiers with 7+ levels solved
          </span>
        </p>
        <div className='w-full h-96'>
          <ResponsiveContainer width='100%' height='100%'>
            <ComposedChart data={timeInvestmentData} margin={{ top: 60, right: 30, left: 0, bottom: 20 }}>
              <XAxis
                dataKey='difficultyIndex'
                type='number'
                domain={[-0.5, difficultyList.filter(d => d.name !== 'Pending').length - 0.5]}
                orientation='top'
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                ticks={Array.from({ length: difficultyList.filter(d => d.name !== 'Pending').length }, (_, i) => i)}
                tickFormatter={(value) => {
                  const sortedDifficulties = difficultyList
                    .filter(d => d.name !== 'Pending')
                    .sort((a, b) => a.value - b.value);

                  return sortedDifficulties[value]?.name || '';
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type='number'
                domain={yAxisDomain}
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}%`}
                allowDataOverflow={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(31, 41, 55)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'rgb(229, 231, 235)',
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;

                    // This case shouldn't happen since we filter out <7 solves, but keep for safety
                    if (data.levelCount < 7) {
                      return (
                        <div className='bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-600'>
                          <div className='text-sm text-gray-100'>
                            <div className='font-bold text-blue-400 mb-2'>{data.difficulty} Difficulty</div>
                            <div className='text-gray-400 italic'>Need 7+ levels for comparison ({data.levelCount} solved)</div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className='bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-600'>
                        <div className='text-sm text-gray-100'>
                          <div className='font-bold text-blue-400 mb-2'>{data.difficulty} Difficulty</div>
                          <div>Levels solved: <span className='font-bold'>{data.levelCount}</span></div>
                          <div className='border-t border-gray-600 mt-2 pt-2'>
                            <div className='text-lg font-bold mb-1'>
                              <span style={{ color: data.userColor }}>
                                {data.percentageDelta > 0 ? '+' : ''}{data.percentageDelta}%
                              </span>
                            </div>
                            <div className='text-xs text-gray-400'>
                              {data.percentageDelta > 0 ?
                                `⚡ ${data.percentageDelta}% faster than community average` :
                                data.percentageDelta < 0 ?
                                  `🐌 ${Math.abs(data.percentageDelta)}% slower than community average` :
                                  '📊 Same as community average'
                              }
                            </div>
                            <div className='mt-2 text-xs text-gray-500'>
                              <div>Your average: {formatTimePerLevel(data.avgTimePerLevelSeconds)}</div>
                              {data.thresholdTime > 0.1 && (
                                <div>Community average: {formatTimePerLevel(data.thresholdTime * 60)}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                }}
              />
              <ReferenceLine
                y={0}
                stroke='#6B7280'
                strokeDasharray='2 2'
                label={{ value: 'Community Average', position: 'insideTopRight' as const, style: { fill: '#9CA3AF', fontSize: '12px' } }}
              />
              <Bar
                dataKey='percentageDelta'
                name='Performance vs Community'
                fillOpacity={0.5}
              >
                {timeInvestmentData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.userColor}
                    style={{
                      transition: 'opacity 0.2s ease-in-out',
                    }}
                    onMouseEnter={(e: React.MouseEvent<SVGElement>) => {
                      (e.target as SVGElement).style.fillOpacity = '1';
                    }}
                    onMouseLeave={(e: React.MouseEvent<SVGElement>) => {
                      (e.target as SVGElement).style.fillOpacity = '0.5';
                    }}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className='bg-gray-800 rounded-lg p-3 mt-2'>
          <div className='flex items-center justify-center gap-6 text-sm flex-wrap'>
            <div className='flex items-center gap-2'>
              <div className='w-3 h-3 bg-green-500 rounded' />
              <span className='text-gray-300'>Faster than average (above baseline)</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-3 h-3 bg-red-500 rounded' />
              <span className='text-gray-300'>Slower than average (below baseline)</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-1 bg-gray-500 rounded border-t border-dashed border-gray-500' />
              <span className='text-gray-300'>Community baseline (0%)</span>
            </div>
          </div>
        </div>
      </div>
      {/* Time-of-Day Performance Analysis - Clock Visualization */}
      {timeOfDayPerformance && (
        <div className='flex flex-col gap-2'>
          <h2 className='text-xl font-bold text-center'>Performance by Time of Day</h2>
          <p className='text-sm text-gray-400 text-center mb-2'>
            When do you perform best compared to your own average?
          </p>
          <p className='text-xs text-gray-500 text-center mb-4'>
            Timezone: {timeOfDayPerformance.timezone}
          </p>
          {/* Performance Gauge Visualization */}
          <div className='w-full'>
            <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-4'>
              {timeOfDayPerformance.clockData.map((period, index) => {
                const relPerf = period.relativePerformance;

                // Create gauge data - performance range from -50 to +50, centered at 0
                const normalizedPerf = Math.max(-50, Math.min(50, relPerf));
                const gaugeValue = 50 + normalizedPerf; // Convert to 0-100 scale


                // Needle angle calculation: 0% performance = 90° (pointing up/north)
                // Left side (180°) = worst performance (-50%), Right side (0°) = best performance (+50%)
                const needleAngle = 180 - (gaugeValue / 100) * 180;

                const IconComponent = period.icon;

                return (
                  <div key={index} className='group relative'>
                    <div className='bg-gray-800 rounded-lg border border-gray-600 p-2 text-center hover:shadow-lg transition-all min-h-[170px] flex flex-col'>
                      <div className='text-sm font-bold text-white flex items-center justify-center gap-2'>
                        <IconComponent size={16} />
                        {period.period}
                      </div>
                      <div className='text-xs text-gray-400'>
                        {period.sublabel}
                      </div>
                      
                      {/* Gauge Chart */}
                      <div className='relative h-32 w-full flex-1 -mt-1'>
                        <svg
                          className='w-full h-full'
                          viewBox='0 0 100 100'
                          preserveAspectRatio='xMidYMid meet'
                        >
                          <defs>
                            <linearGradient id={`gradient-${index}`} x1='0' y1='0' x2='1' y2='0'>
                              <stop offset='0%' stopColor='#DC2626' />
                              <stop offset='25%' stopColor='#F97316' />
                              <stop offset='50%' stopColor='#F59E0B' />
                              <stop offset='75%' stopColor='#84CC16' />
                              <stop offset='100%' stopColor='#10B981' />
                            </linearGradient>
                          </defs>
                          
                          {/* Background semicircle arc */}
                          <path
                            d='M 15 70 A 35 35 0 0 1 85 70'
                            fill='none'
                            stroke={period.hasData ? `url(#gradient-${index})` : '#374151'}
                            strokeWidth='8'
                            strokeLinecap='round'
                          />
                          
                          {/* Inner arc for depth */}
                          <path
                            d='M 20 70 A 30 30 0 0 1 80 70'
                            fill='none'
                            stroke='rgba(0, 0, 0, 0.3)'
                            strokeWidth='2'
                          />
                        </svg>
                        
                        {/* Needle overlay - positioned absolutely */}
                        {period.hasData && (
                          <svg
                            className='absolute inset-0 w-full h-full pointer-events-none'
                            viewBox='0 0 100 100'
                          >
                            <line
                              x1='50'
                              y1='70'
                              x2={50 + 40 * Math.cos(needleAngle * Math.PI / 180)}
                              y2={70 - 40 * Math.sin(needleAngle * Math.PI / 180)}
                              stroke='#FFFFFF'
                              strokeWidth='2'
                              strokeLinecap='round'
                            />
                            <circle
                              cx='50'
                              cy='70'
                              r='2'
                              fill='#FFFFFF'
                            />
                          </svg>
                        )}
                      </div>
                      
                      {/* Performance Value Display */}
                      <div className='text-center mt-auto -mt-2'>
                        {period.hasData ? (
                          <>
                            <div className='text-xl font-bold text-white'>
                              {relPerf >= 0 ? '+' : ''}{relPerf.toFixed(0)}%
                            </div>
                            <div className='text-xs text-gray-300'>
                              {period.levelCount} levels solved
                            </div>
                          </>
                        ) : (
                          <div className='text-sm text-gray-500'>
                            No data
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Hover Tooltip */}
                    <div className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 w-48 pointer-events-none'>
                      <div className='font-bold mb-1'>{period.period} ({period.sublabel})</div>
                      {period.hasData ? (
                        <>
                          <div className='flex items-center gap-1 mb-1'>
                            <div className='w-2 h-2 rounded-full' style={{ backgroundColor: period.color }} />
                            <span>
                              {Math.abs(relPerf).toFixed(1)}% {relPerf >= 0 ? 'better' : 'worse'} than your average
                            </span>
                          </div>
                          <div>Levels solved: <span className='font-bold'>{period.levelCount}</span></div>
                        </>
                      ) : (
                        <div className='text-gray-400'>No data for this time period</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Performance Scale Legend */}
            <div className='bg-gray-800 rounded-lg p-4 text-center'>
              <h4 className='font-bold mb-3'>Performance Scale</h4>
              <div className='flex items-center justify-center gap-4 mb-2'>
                <span className='text-xs text-gray-400'>Much worse</span>
                <div className='flex items-center gap-1'>
                  {[-20, -10, 0, 10, 20].map((val, i) => (
                    <div
                      key={i}
                      className='w-6 h-4 rounded'
                      style={{
                        backgroundColor: val > 10 ? '#10B981' :
                          val > 5 ? '#22C55E' :
                            val > 0 ? '#84CC16' :
                              val > -5 ? '#F59E0B' :
                                val > -10 ? '#F97316' : '#DC2626'
                      }}
                    />
                  ))}
                </div>
                <span className='text-xs text-gray-400'>Much better</span>
              </div>
              <div className='text-xs text-gray-500'>
                Color intensity shows how much your performance differs from your average
              </div>
            </div>
          </div>
          <div className='bg-gray-800 rounded-lg p-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <h3 className='font-bold mb-2'>Best Performance Time</h3>
                {timeOfDayPerformance.bestPeriod >= 0 ? (
                  <p className='text-sm text-green-400'>
                    Peak performance: {['Late Night', 'Morning', 'Afternoon', 'Evening', 'Night'][timeOfDayPerformance.bestPeriod]}
                  </p>
                ) : (
                  <p className='text-sm text-gray-500'>Not enough data yet</p>
                )}
              </div>
              <div>
                <h3 className='font-bold mb-2'>Performance Legend</h3>
                <div className='flex flex-wrap gap-2 text-xs'>
                  <div className='flex items-center gap-1'>
                    <div className='w-2 h-2 bg-green-500 rounded-full' />
                    <span>Better (+10%+)</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <div className='w-2 h-2 bg-orange-500 rounded-full' />
                    <span>Slightly worse</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <div className='w-2 h-2 bg-red-500 rounded-full' />
                    <span>Much worse (-10%+)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Activity by Day of Week */}
      <div className='flex flex-col gap-2'>
        <h2 className='text-xl font-bold text-center'>Activity by Day of Week</h2>
        <p className='text-sm text-gray-400 text-center mb-4'>
          Average levels solved per day, grouped by day of the week
        </p>
        <div className='w-full h-64'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={activityHeatmap} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <XAxis
                dataKey='day'
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis
                tick={{ fill: '#9CA3AF' }}
                label={{ value: 'Avg Levels/Day', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length > 0 && payload[0].payload) {
                    const data = payload[0].payload;
                    const value = payload[0].value as number;
                    
                    return (
                      <div className='bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-600'>
                        <div className='text-center mb-3'>
                          <h4 className='font-bold text-blue-400 text-lg'>{label}</h4>
                          <div className='w-8 h-0.5 bg-blue-400 mx-auto mt-1'></div>
                        </div>
                        <div className='space-y-2 text-sm'>
                          <div className='flex items-center justify-between gap-4'>
                            <span className='text-gray-300'>Average per day:</span>
                            <span className='font-bold text-white text-lg'>{value.toFixed(1)} levels</span>
                          </div>
                          <div className='flex items-center justify-between gap-4'>
                            <span className='text-gray-300'>Total solved:</span>
                            <span className='font-semibold text-blue-300'>{data.totalSolves} levels</span>
                          </div>
                          <div className='flex items-center justify-between gap-4'>
                            <span className='text-gray-300'>Active days:</span>
                            <span className='font-semibold text-green-300'>{data.daysActive} days</span>
                          </div>
                          {data.daysActive > 0 && (
                            <div className='pt-2 mt-2 border-t border-gray-600'>
                              <div className='text-xs text-gray-400 text-center'>
                                {data.daysActive === 1 ? 'Single active day' : 
                                 `Averaged across ${data.daysActive} active days`}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey='avgSolves' fill='#3B82F6' radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Time Analytics Summary */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='bg-gray-800 rounded-lg p-4'>
          <h3 className='font-bold mb-2'>Most Active Days</h3>
          <ul className='text-sm text-gray-300 space-y-1'>
            {peakDays.length > 0 ? (
              peakDays.map((day, index) => (
                <li key={index}>#{index + 1}: {day}</li>
              ))
            ) : (
              <li className='text-gray-500'>Not enough data yet</li>
            )}
          </ul>
        </div>
        
        <div className='bg-gray-800 rounded-lg p-4'>
          <h3 className='font-bold mb-2'>Time Investment ROI</h3>
          <div className='text-sm text-gray-300 space-y-2'>
            {timeInvestmentData.length > 0 && (
              <>
                <div>
                  Most time spent: <span className='text-blue-400'>
                    {timeInvestmentData.sort((a, b) => b.totalTime - a.totalTime)[0].difficulty}
                  </span>
                </div>
                <div>
                  Most efficient: <span className='text-green-400'>
                    {timeInvestmentData.sort((a, b) => a.avgTimePerLevel - b.avgTimePerLevel)[0].difficulty}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
