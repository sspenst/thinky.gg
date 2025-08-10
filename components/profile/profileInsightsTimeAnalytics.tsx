import Role from '@root/constants/role';
import { DateAndSum } from '@root/contexts/levelContext';
import { hasProAccessForProfile } from '@root/helpers/isDemoProAccess';
import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { Moon, Star, Sun, Sunrise, Sunset } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import User from '../../models/db/user';
import { difficultyList, getDifficultyColor, getDifficultyFromEstimate } from '../formatted/formattedDifficulty';
import FormattedLevelLink from '../formatted/formattedLevelLink';
import { TimeFilter } from './profileInsights';

dayjs.extend(utc);
dayjs.extend(timezone);

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
  const canViewTimeAnalytics = (reqUser?._id === user._id) || (reqUser?.roles?.includes(Role.ADMIN)) || hasProAccessForProfile(reqUser, user);
  const { proStatsUser: scoreHistory, isLoading: isLoadingScoreHistory } = useProStatsUser(user, ProStatsUserType.ScoreHistory, timeFilter, !canViewTimeAnalytics);
  const { proStatsUser: difficultyData, isLoading: isLoadingDifficulty } = useProStatsUser(user, ProStatsUserType.DifficultyLevelsComparisons, timeFilter, !canViewTimeAnalytics);

  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<'yourTime' | 'averageTime' | 'comparison'>('comparison');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedTimezone, setSelectedTimezone] = useState<string>(dayjs.tz.guess());

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
      _id: string;
      name: string;
      slug: string;
      difficulty: number;
      calc_playattempts_just_beaten_count: number;
    }>;
    const validComparisons = comparisons.filter(c =>
      c.myPlayattemptsSumDuration && c.otherPlayattemptsAverageDuration && c.ts
    );

    if (validComparisons.length === 0) return null;

    // Get user's timezone
    const userTimezone = selectedTimezone;

    // Calculate user's overall average performance ratio
    const overallAvgRatio = validComparisons.reduce((sum, c) =>
      sum + (c.otherPlayattemptsAverageDuration / c.myPlayattemptsSumDuration), 0
    ) / validComparisons.length;

    // Initialize hourly data with level details
    const hourlyData: { [hour: number]: { sumRatio: number, count: number, levels: typeof validComparisons } } = {};

    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { sumRatio: 0, count: 0, levels: [] };
    }

    // Group by hour using selected timezone
    validComparisons.forEach(c => {
      const dateInTimezone = dayjs.unix(c.ts).tz(selectedTimezone);
      const hour = dateInTimezone.hour();
      const performanceRatio = c.otherPlayattemptsAverageDuration / c.myPlayattemptsSumDuration;

      hourlyData[hour].count++;
      hourlyData[hour].sumRatio += performanceRatio;
      hourlyData[hour].levels.push(c);
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
      levels: typeof validComparisons;
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
      const periodLevels: typeof validComparisons = [];

      // Aggregate data for this time period
      for (let hour = period.start; hour <= period.end; hour++) {
        const data = hourlyData[hour];

        if (data.count > 0) {
          totalRatio += data.sumRatio;
          totalCount += data.count;
          periodLevels.push(...data.levels);
        }
      }

      let performance = 50; // Default to middle (no data)
      let relativePerformance = 0;
      let color = '#374151'; // Dark gray for no data
      let hasData = false;

      if (totalCount >= 7) {
        hasData = true;
        const avgRatio = totalRatio / totalCount;

        // Calculate what percentage of levels in this period beat community average
        const levelsBeatCommunity = periodLevels.filter(level => {
          const ratio = level.otherPlayattemptsAverageDuration / level.myPlayattemptsSumDuration;

          return ratio >= 1.0; // Faster than community
        }).length;

        const percentageBeatingCommunity = (levelsBeatCommunity / totalCount) * 100;

        relativePerformance = percentageBeatingCommunity;
        // Use percentage directly for radar chart (50% would be middle performance)
        performance = Math.max(0, Math.min(100, percentageBeatingCommunity));

        // Track best/worst periods
        if (relativePerformance > bestPerformance) {
          bestPerformance = relativePerformance;
          bestPeriod = period.position;
        }

        if (relativePerformance < worstPerformance) {
          worstPerformance = relativePerformance;
          worstPeriod = period.position;
        }

        // Color based on percentage of levels beat community average
        if (relativePerformance >= 80) color = '#10B981'; // Green - 80%+ beat community
        else if (relativePerformance >= 65) color = '#22C55E'; // Light green - 65%+
        else if (relativePerformance >= 50) color = '#84CC16'; // Yellow-green - 50%+ (average)
        else if (relativePerformance >= 35) color = '#F59E0B'; // Orange - 35%+
        else if (relativePerformance >= 20) color = '#F97316'; // Red-orange - 20%+
        else color = '#DC2626'; // Red - <20% beat community
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
        levels: periodLevels,
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
  }, [difficultyData, selectedTimezone]);

  // Only show loading if we can view data and hooks are actually loading
  const isLoading = canViewTimeAnalytics && (isLoadingScoreHistory || isLoadingDifficulty);

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

  // Access control - only show for own profile or admin

  if (!canViewTimeAnalytics) {
    return (
      <div className='text-center text-lg text-gray-400'>
        <p>Time analytics data is only available for your own profile.</p>
      </div>
    );
  }

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
      {/* Time-of-Day Performance Analysis - Clock Visualization */}
      {timeOfDayPerformance && (
        <div className='flex flex-col gap-2'>
          <h2 className='text-xl font-bold text-center'>Performance by Time of Day</h2>
          <p className='text-sm text-gray-400 text-center mb-2'>
            What percentage of levels you solve faster than community average, by time of day
            <span className='block text-xs text-gray-500 mt-1'>
              💡 Click on any time period with 7+ levels to see detailed breakdown
            </span>
          </p>
          <div className='flex items-center justify-center gap-2 mb-4'>
            <label className='text-xs text-gray-500'>Timezone:</label>
            <select
              value={selectedTimezone}
              onChange={(e) => setSelectedTimezone(e.target.value)}
              className='text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500'
            >
              <optgroup label='Common Timezones'>
                <option value={dayjs.tz.guess()}>Browser Default ({dayjs.tz.guess()})</option>
                <option value='America/New_York'>Eastern Time (New York)</option>
                <option value='America/Chicago'>Central Time (Chicago)</option>
                <option value='America/Denver'>Mountain Time (Denver)</option>
                <option value='America/Los_Angeles'>Pacific Time (Los Angeles)</option>
                <option value='Europe/London'>London (GMT/BST)</option>
                <option value='Europe/Paris'>Central European Time (Paris)</option>
                <option value='Europe/Moscow'>Moscow Time</option>
                <option value='Asia/Tokyo'>Japan Time (Tokyo)</option>
                <option value='Asia/Shanghai'>China Time (Shanghai)</option>
                <option value='Asia/Kolkata'>India Time (Kolkata)</option>
                <option value='Australia/Sydney'>Sydney Time</option>
              </optgroup>
              <optgroup label='UTC Offsets'>
                <option value='UTC'>UTC+0</option>
                <option value='Etc/GMT+12'>UTC-12</option>
                <option value='Etc/GMT+11'>UTC-11</option>
                <option value='Etc/GMT+10'>UTC-10</option>
                <option value='Etc/GMT+9'>UTC-9</option>
                <option value='Etc/GMT+8'>UTC-8</option>
                <option value='Etc/GMT+7'>UTC-7</option>
                <option value='Etc/GMT+6'>UTC-6</option>
                <option value='Etc/GMT+5'>UTC-5</option>
                <option value='Etc/GMT+4'>UTC-4</option>
                <option value='Etc/GMT+3'>UTC-3</option>
                <option value='Etc/GMT+2'>UTC-2</option>
                <option value='Etc/GMT+1'>UTC-1</option>
                <option value='Etc/GMT-1'>UTC+1</option>
                <option value='Etc/GMT-2'>UTC+2</option>
                <option value='Etc/GMT-3'>UTC+3</option>
                <option value='Etc/GMT-4'>UTC+4</option>
                <option value='Etc/GMT-5'>UTC+5</option>
                <option value='Etc/GMT-6'>UTC+6</option>
                <option value='Etc/GMT-7'>UTC+7</option>
                <option value='Etc/GMT-8'>UTC+8</option>
                <option value='Etc/GMT-9'>UTC+9</option>
                <option value='Etc/GMT-10'>UTC+10</option>
                <option value='Etc/GMT-11'>UTC+11</option>
                <option value='Etc/GMT-12'>UTC+12</option>
              </optgroup>
            </select>
          </div>
          {/* Performance Gauge Visualization */}
          <div className='w-full'>
            <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-4'>
              {timeOfDayPerformance.clockData.map((period, index) => {
                const relPerf = period.relativePerformance;

                // Needle angle calculation: 50% performance should point straight up (90°)
                // 0% performance = 180° (left), 50% performance = 90° (up), 100% performance = 0° (right)
                const clampedPerf = Math.max(0, Math.min(100, relPerf)); // Clamp to 0-100%
                const needleAngle = 180 - (clampedPerf / 100) * 180;

                const IconComponent = period.icon;

                return (
                  <div key={index} className='group relative'>
                    <div
                      className={`bg-gray-800 rounded-lg border border-gray-600 p-2 text-center hover:shadow-lg transition-all min-h-[170px] flex flex-col ${period.hasData ? 'cursor-pointer hover:border-blue-500' : ''}`}
                      onClick={() => {
                        if (period.hasData) {
                          const newPeriod = selectedTimePeriod === period.period ? null : period.period;

                          setSelectedTimePeriod(newPeriod);
                          // Reset pagination and sorting when changing periods
                          setCurrentPage(1);
                          setSortColumn('comparison');
                          setSortDirection('desc');
                        }
                      }}
                    >
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
                              {relPerf.toFixed(0)}%
                            </div>
                            <div className='text-xs text-gray-300'>
                              {period.levelCount} levels solved
                            </div>
                          </>
                        ) : (
                          <>
                            <div className='text-sm text-gray-500 h-11'>
                            No data
                            </div>
                          </>
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
                              {relPerf.toFixed(1)}% of levels solved faster than community average
                            </span>
                          </div>
                          <div>Levels solved: <span className='font-bold'>{period.levelCount}</span></div>
                        </>
                      ) : (
                        <div className='text-gray-400'>
                          {period.levelCount > 0 ?
                            `Need 7+ levels (${period.levelCount} solved)` :
                            'No data for this time period'
                          }
                        </div>
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
                <span className='text-xs text-gray-400'>Poor (0%)</span>
                <div className='flex items-center gap-1'>
                  {[20, 35, 50, 65, 80].map((val, i) => (
                    <div
                      key={i}
                      className='w-6 h-4 rounded'
                      style={{
                        backgroundColor: val >= 80 ? '#10B981' :
                          val >= 65 ? '#22C55E' :
                            val >= 50 ? '#84CC16' :
                              val >= 35 ? '#F59E0B' :
                                val >= 20 ? '#F97316' : '#DC2626'
                      }}
                    />
                  ))}
                </div>
                <span className='text-xs text-gray-400'>Excellent (100%)</span>
              </div>
              <div className='text-xs text-gray-500'>
                Percentage of levels solved faster than community average during each time period
              </div>
            </div>
          </div>
          {/* Selected Time Period Details */}
          {selectedTimePeriod && (() => {
            const selectedPeriodData = timeOfDayPerformance.clockData.find(p => p.period === selectedTimePeriod);

            if (!selectedPeriodData || !selectedPeriodData.hasData) return null;

            // Process and sort levels based on current sort settings
            const processedLevels = selectedPeriodData.levels.map(level => ({
              ...level,
              performanceRatio: level.otherPlayattemptsAverageDuration / level.myPlayattemptsSumDuration,
              dateSolved: dayjs.unix(level.ts).tz(selectedTimezone).format('MMM DD, YYYY h:mmA z'),
            }));

            // Sort levels based on current sort column and direction
            const sortedLevels = [...processedLevels].sort((a, b) => {
              let aVal: number, bVal: number;

              switch (sortColumn) {
              case 'yourTime':
                aVal = a.myPlayattemptsSumDuration;
                bVal = b.myPlayattemptsSumDuration;
                break;
              case 'averageTime':
                aVal = a.otherPlayattemptsAverageDuration;
                bVal = b.otherPlayattemptsAverageDuration;
                break;
              case 'comparison':
              default:
                aVal = a.performanceRatio;
                bVal = b.performanceRatio;
                break;
              }

              return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
            });

            // Pagination
            const itemsPerPage = 10;
            const totalPages = Math.ceil(sortedLevels.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const paginatedLevels = sortedLevels.slice(startIndex, startIndex + itemsPerPage);

            const handleSort = (column: typeof sortColumn) => {
              if (sortColumn === column) {
                setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
              } else {
                setSortColumn(column);
                setSortDirection('desc');
              }

              setCurrentPage(1); // Reset to first page when sorting
            };

            const getSortIcon = (column: typeof sortColumn) => {
              if (sortColumn !== column) return '↕️';

              return sortDirection === 'desc' ? '↓' : '↑';
            };

            return (
              <div className='mt-6 bg-gray-800 rounded-lg p-4'>
                <div className='flex items-center justify-between mb-3'>
                  <h3 className='font-bold text-lg'>Levels Solved During {selectedPeriodData.period} ({selectedPeriodData.sublabel})</h3>
                  <button
                    onClick={() => setSelectedTimePeriod(null)}
                    className='text-gray-400 hover:text-gray-200 text-xl'
                  >
                    ×
                  </button>
                </div>
                <p className='text-sm text-gray-400 mb-4'>
                  Performance: <span className='text-green-400 font-bold'>
                    {selectedPeriodData.relativePerformance.toFixed(1)}% of levels faster than community
                  </span> •
                  <span className='ml-2'>Levels solved: <span className='text-blue-400 font-bold'>{selectedPeriodData.levelCount}</span></span>
                </p>
                <p className='text-xs text-gray-500 mb-3'>
                  Showing {paginatedLevels.length} of {sortedLevels.length} levels solved during this time period:
                </p>
                <div className='bg-gray-800 rounded-lg overflow-hidden'>
                  <table className='w-full text-sm'>
                    <thead className='bg-gray-700'>
                      <tr>
                        <th className='text-left p-3'>Level</th>
                        <th className='text-center p-3'>Difficulty</th>
                        <th className='text-center p-3'>Date Solved</th>
                        <th
                          className='text-center p-3 cursor-pointer hover:bg-gray-600 select-none'
                          onClick={() => handleSort('yourTime')}
                        >
                          Your Time {getSortIcon('yourTime')}
                        </th>
                        <th
                          className='text-center p-3 cursor-pointer hover:bg-gray-600 select-none'
                          onClick={() => handleSort('averageTime')}
                        >
                          Average Time {getSortIcon('averageTime')}
                        </th>
                        <th
                          className='text-center p-3 cursor-pointer hover:bg-gray-600 select-none'
                          onClick={() => handleSort('comparison')}
                        >
                          Comparison {getSortIcon('comparison')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLevels.map((level, index) => (
                        <tr key={index} className='border-t border-gray-700'>
                          <td className='p-3'>
                            <FormattedLevelLink
                              id={`time-period-level-${index}`}
                              level={{ _id: level._id, name: level.name, slug: level.slug } as any}
                            />
                          </td>
                          <td className='text-center p-3'>
                            <span className='px-2 py-1 rounded text-xs' style={{
                              backgroundColor: getDifficultyColor(level.difficulty) + '20',
                              color: getDifficultyColor(level.difficulty),
                            }}>
                              {getDifficultyFromEstimate(level.difficulty).name}
                            </span>
                          </td>
                          <td className='text-center p-3 text-xs'>{level.dateSolved}</td>
                          <td className='text-center p-3'>{dayjs.duration(level.myPlayattemptsSumDuration * 1000).format('mm:ss')}</td>
                          <td className='text-center p-3'>{dayjs.duration(level.otherPlayattemptsAverageDuration * 1000).format('mm:ss')}</td>
                          <td className='text-center p-3'>
                            <div className='group relative'>
                              <span className={`cursor-help underline decoration-dashed ${level.performanceRatio >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                                {level.performanceRatio >= 1 ?
                                  `${((level.performanceRatio - 1) * 100).toFixed(0)}% faster` :
                                  `${((1 - level.performanceRatio) * 100).toFixed(0)}% slower`
                                }
                              </span>
                              <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap'>
                                <div className='text-xs text-gray-300'>
                                  <div>Your time: {level.myPlayattemptsSumDuration.toFixed(1)}s</div>
                                  <div>Community average: {level.otherPlayattemptsAverageDuration.toFixed(1)}s</div>
                                  <div>vs {level.calc_playattempts_just_beaten_count} solvers</div>
                                  <div className={`mt-1 ${level.performanceRatio >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                                    {level.otherPlayattemptsAverageDuration.toFixed(1)}s ÷ {level.myPlayattemptsSumDuration.toFixed(1)}s = {level.performanceRatio.toFixed(2)}x
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className='flex items-center justify-between mt-4'>
                    <div className='text-sm text-gray-400'>
                      Page {currentPage} of {totalPages} ({sortedLevels.length} total levels)
                    </div>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className='px-3 py-1 bg-gray-700 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600'
                      >
                        Previous
                      </button>
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;

                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 rounded text-sm ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-white hover:bg-gray-600'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className='px-3 py-1 bg-gray-700 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600'
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
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
                    <span>Excellent (80%+)</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <div className='w-2 h-2 bg-yellow-500 rounded-full' />
                    <span>Average (50%)</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <div className='w-2 h-2 bg-red-500 rounded-full' />
                    <span>Poor (20%-)</span>
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
                          <div className='w-8 h-0.5 bg-blue-400 mx-auto mt-1' />
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
