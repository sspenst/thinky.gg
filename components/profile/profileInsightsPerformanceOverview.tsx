import Role from '@root/constants/role';
import { AppContext } from '@root/contexts/appContext';
import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import duration from 'dayjs/plugin/duration';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useContext, useMemo, useState } from 'react';
import { Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Text, Tooltip, XAxis, YAxis } from 'recharts';
import TileType from '../../constants/tileType';
import User from '../../models/db/user';
import { difficultyList, getDifficultyColor, getDifficultyFromEstimate } from '../formatted/formattedDifficulty';
import FormattedLevelLink from '../formatted/formattedLevelLink';
import { TimeFilter } from './profileInsights';
import ProfileInsightsRecords from './profileInsightsRecords';
import ProfileInsightsScoreChart from './profileInsightsScoreChart';
import { DifficultyLevelComparison } from './profileInsightsSolveTimeComparison';

dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

interface ProfileInsightsPerformanceOverviewProps {
  user: User;
  reqUser: User | null;
  timeFilter: TimeFilter;
}

interface PerformanceMetric {
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}

interface DifficultyProgressData {
  name: string;
  value: number;
  color: string;
  levelCount: number;
  firstSolved?: string;
  latestSolved?: string;
}

// Color function for performance percentiles
function getPerformanceColor(performance: number, baseline: number = 50): string {
  if (baseline === 100) {
    // For level type performance (100 = baseline)
    if (performance >= 130) return '#10B981'; // green-500 - Much better than your average
    if (performance >= 110) return '#3B82F6'; // blue-500 - Better than your average
    if (performance >= 90) return '#F59E0B'; // amber-500 - Similar to your average
    if (performance >= 70) return '#EF4444'; // red-500 - Worse than your average
    return '#6B7280'; // gray-500 - Much worse than your average
  } else {
    // Original logic for community comparison
    if (performance >= 80) return '#10B981'; // green-500 - Excellent
    if (performance >= 65) return '#3B82F6'; // blue-500 - Good
    if (performance >= 50) return '#F59E0B'; // amber-500 - Average
    if (performance >= 35) return '#EF4444'; // red-500 - Below average
    return '#6B7280'; // gray-500 - Poor
  }
}

export default function ProfileInsightsPerformanceOverview({ user, reqUser, timeFilter }: ProfileInsightsPerformanceOverviewProps) {
  const { game: _game } = useContext(AppContext);
  const { proStatsUser: difficultyData, isLoading: isLoadingDifficulty } = useProStatsUser(user, ProStatsUserType.DifficultyLevelsComparisons, timeFilter);
  const { proStatsUser: _scoreHistory, isLoading: isLoadingScoreHistory } = useProStatsUser(user, ProStatsUserType.ScoreHistory, timeFilter);
  const { proStatsUser: recordsData, isLoading: isLoadingRecords } = useProStatsUser(user, ProStatsUserType.Records, timeFilter);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [timelineMode, setTimelineMode] = useState<'max' | 'average'>('average');

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    const metrics: PerformanceMetric[] = [];

    // Total solves
    metrics.push({
      label: 'Total Solves',
      value: user.config?.calcLevelsSolvedCount || 0,
      color: 'text-blue-400',
    });

    // Current streak
    if (user.config?.calcCurrentStreak && user.config?.calcCurrentStreak > 0) {
      metrics.push({
        label: 'Current Streak',
        value: `${user.config.calcCurrentStreak} days`,
        color: 'text-orange-400',
      });
    }

    // Max streak
    // Note: max streak is not currently tracked in UserConfig, so commenting out for now
    // if (user.config?.calc_max_streak_days && user.config?.calc_max_streak_days > 0) {
    //   metrics.push({
    //     label: 'Best Streak',
    //     value: `${user.config.calc_max_streak_days} days`,
    //     color: 'text-purple-400',
    //   });
    // }

    // Average performance vs peers - using only 7+ solve difficulties
    if (difficultyData && difficultyData[ProStatsUserType.DifficultyLevelsComparisons]) {
      const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as DifficultyLevelComparison[];

      // Group by difficulty and only include those with 7+ solves
      const difficultyGroups = new Map<string, DifficultyLevelComparison[]>();

      comparisons.forEach(c => {
        if (!c.difficulty || !c.otherPlayattemptsAverageDuration || !c.myPlayattemptsSumDuration) return;
        const difficulty = getDifficultyFromEstimate(c.difficulty).name;

        if (!difficultyGroups.has(difficulty)) {
          difficultyGroups.set(difficulty, []);
        }

        difficultyGroups.get(difficulty)!.push(c);
      });

      // Only include difficulties with 7+ solves
      const validComparisons = Array.from(difficultyGroups.values())
        .filter(group => group.length >= 7)
        .flat();

    }

    return metrics;
  }, [user, difficultyData]);

  // Calculate difficulty progression
  const difficultyProgression = useMemo(() => {
    if (!difficultyData || !difficultyData[ProStatsUserType.DifficultyLevelsComparisons]) {
      return [];
    }

    const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as any[];
    const progressionMap = new Map<string, DifficultyProgressData>();

    // Use official difficulty colors from the helper function
    const difficultyConfig = difficultyList
      .filter(d => d.name !== 'Pending') // Skip pending difficulty
      .map((d) => ({
        name: d.name,
        color: getDifficultyColor(d.value, 60), // Use official color function with 60% lightness
        value: d.value,
      }));

    // Initialize all difficulties
    difficultyConfig.forEach(config => {
      progressionMap.set(config.name, {
        name: config.name,
        value: config.value,
        color: config.color,
        levelCount: 0,
      });
    });

    // Count levels and track dates
    comparisons.forEach(c => {
      if (!c.difficulty) return;

      const difficulty = getDifficultyFromEstimate(c.difficulty);
      const data = progressionMap.get(difficulty.name);

      if (data) {
        data.levelCount++;
        const solveDate = dayjs(c.ts * 1000).format('MMM DD, YYYY');

        if (!data.firstSolved || c.ts < dayjs(data.firstSolved).unix()) {
          data.firstSolved = solveDate;
        }

        if (!data.latestSolved || c.ts > dayjs(data.latestSolved).unix()) {
          data.latestSolved = solveDate;
        }
      }
    });

    return Array.from(progressionMap.values()).filter(d => d.levelCount > 0);
  }, [difficultyData]);

  // Calculate difficulty timeline with level details
  const difficultyTimeline = useMemo(() => {
    if (!difficultyData || !difficultyData[ProStatsUserType.DifficultyLevelsComparisons]) {
      return [];
    }

    const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as any[];
    const timeline = new Map<string, {
      date: string,
      totalDifficulty: number,
      maxDifficulty: number,
      levelCount: number,
      allLevels: any[],
      monthKey: string
    }>();

    // Group by month and collect all levels with their difficulties
    comparisons.forEach(c => {
      if (!c.difficulty || !c.ts) return;

      const monthKey = dayjs(c.ts * 1000).format('YYYY-MM');
      const displayDate = dayjs(c.ts * 1000).format('MMM YYYY');

      const existing = timeline.get(monthKey);

      if (!existing) {
        timeline.set(monthKey, {
          date: displayDate,
          totalDifficulty: c.difficulty,
          maxDifficulty: c.difficulty,
          levelCount: 1,
          allLevels: [c],
          monthKey,
        });
      } else {
        existing.totalDifficulty += c.difficulty;
        existing.maxDifficulty = Math.max(existing.maxDifficulty, c.difficulty);
        existing.levelCount++;
        existing.allLevels.push(c);
      }
    });

    // Convert to array and sort, calculate based on mode
    return Array.from(timeline.values())
      .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix())
      .map(entry => {
        const displayDifficulty = timelineMode === 'average'
          ? entry.totalDifficulty / entry.levelCount
          : entry.maxDifficulty;
        const difficultyObj = getDifficultyFromEstimate(displayDifficulty);
        // Find hardest levels for click details
        const hardestLevels = entry.allLevels
          .sort((a, b) => b.difficulty - a.difficulty)
          .slice(0, 10);

        return {
          date: entry.date,
          avgDifficulty: displayDifficulty,
          maxDifficulty: entry.maxDifficulty,
          difficulty: difficultyObj.name,
          difficultyRating: displayDifficulty,
          hardestLevels: hardestLevels,
          monthKey: entry.monthKey,
          levelCount: entry.levelCount,
        };
      });
  }, [difficultyData, timelineMode]);

  const selectedMonthData = useMemo(() => {
    if (!selectedMonth) return null;

    return difficultyTimeline.find(entry => entry.monthKey === selectedMonth);
  }, [selectedMonth, difficultyTimeline]);

  // Calculate performance by level type data
  const { skillRadarData, averagePerformance } = useMemo(() => {
    if (!difficultyData || !difficultyData[ProStatsUserType.DifficultyLevelsComparisons]) {
      return { skillRadarData: [], averagePerformance: 100 };
    }

    const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as DifficultyLevelComparison[];

    // Debug: Check if level data is available
    console.log('🔍 Sample level data:', comparisons.slice(0, 3).map(c => ({
      name: c.name,
      hasData: !!c.data,
      dataLength: c.data?.length || 0,
      dataSample: c.data?.substring(0, 20) + '...'
    })));

    // Calculate user's overall average solve time (for comparison baseline)
    let totalTime = 0;
    let totalLevels = 0;

    comparisons.forEach(c => {
      if (c.myPlayattemptsSumDuration && c.myPlayattemptsSumDuration > 0) {
        totalTime += c.myPlayattemptsSumDuration;
        totalLevels++;
      }
    });

    const userAverageTime = totalLevels > 0 ? totalTime / totalLevels : 0;

    // Categorize levels by type
    const levelTypes = new Map<string, { times: number[], totalTime: number, count: number }>();
    let processedLevels = 0;
    let levelsWithData = 0;

    comparisons.forEach(c => {
      if (!c.myPlayattemptsSumDuration || c.myPlayattemptsSumDuration <= 0) return;
      processedLevels++;

      // Analyze the level data to determine type
      const levelData = c.data || '';
      if (levelData) levelsWithData++;

      const hasHoles = levelData.includes(TileType.Hole);

      // Check for restricted movables (directional tiles)
      const restrictedTiles = [
        TileType.Left, TileType.Up, TileType.Right, TileType.Down,
        TileType.UpLeft, TileType.UpRight, TileType.DownRight, TileType.DownLeft,
        TileType.NotLeft, TileType.NotUp, TileType.NotRight, TileType.NotDown,
        TileType.LeftRight, TileType.UpDown
      ];
      const hasRestrictedMovables = restrictedTiles.some(tile => levelData.includes(tile));

      let levelType: string;
      if (hasHoles && hasRestrictedMovables) {
        levelType = 'Complex Levels (Holes + Restricted Movables)';
      } else if (hasHoles) {
        levelType = 'Levels with Holes Only';
      } else if (hasRestrictedMovables) {
        levelType = 'Levels with Restricted Movables Only';
      } else {
        levelType = 'Basic Levels (Regular Movables Only)';
      }

      if (!levelTypes.has(levelType)) {
        levelTypes.set(levelType, { times: [], totalTime: 0, count: 0 });
      }

      const bucket = levelTypes.get(levelType)!;
      bucket.times.push(c.myPlayattemptsSumDuration);
      bucket.totalTime += c.myPlayattemptsSumDuration;
      bucket.count++;
    });

    // Debug: Log categorization results
    console.log('🔍 Level categorization:', {
      totalProcessed: processedLevels,
      levelsWithData: levelsWithData,
      categories: Array.from(levelTypes.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        avgTime: Math.round(data.totalTime / data.count / 1000)
      }))
    });

    // Add "All Levels" category
    if (totalLevels > 0) {
      levelTypes.set('All Levels', {
        times: comparisons.filter(c => c.myPlayattemptsSumDuration && c.myPlayattemptsSumDuration > 0).map(c => c.myPlayattemptsSumDuration!),
        totalTime: totalTime,
        count: totalLevels
      });
    }

    // Convert to radar chart format - only include types with 5+ solves
    const radarData = Array.from(levelTypes.entries())
      .filter(([_type, data]) => data.count >= 5) // Need at least 5 levels
      .map(([levelType, data]) => {
        const avgTime = data.totalTime / data.count;
        // Performance relative to user's overall average (100 = same as average, >100 = better than average, <100 = worse)
        const performance = userAverageTime > 0 ? Math.round((userAverageTime / avgTime) * 100) : 100;

        return {
          difficulty: levelType,
          performance: Math.min(200, Math.max(25, performance)), // Cap between 25-200 for chart readability
          fullMark: 200,
          hasData: true,
          levelCount: data.count,
          averageTime: Math.round(avgTime / 1000), // Convert to seconds
          userOverallAverage: Math.round(userAverageTime / 1000),
          meetsMinimum: true,
          color: getPerformanceColor(performance, 100), // Use 100 as baseline instead of 50
        };
      });

    // Debug: Log final radar data
    console.log('🔍 Final radar data:', radarData.map(item => ({
      type: item.difficulty,
      performance: item.performance,
      levelCount: item.levelCount,
      color: item.color
    })));

    const avgPerf = radarData.length > 0
      ? radarData.reduce((sum, item) => sum + (item.performance || 100), 0) / radarData.length
      : 100;

    return { skillRadarData: radarData, averagePerformance: avgPerf };
  }, [difficultyData]);

  const isOwnProfile = reqUser?._id === user._id;
  const isAdmin = reqUser?.roles?.includes(Role.ADMIN);
  const isLoading = isLoadingDifficulty || isLoadingScoreHistory || isLoadingRecords;

  // Loading components
  const _LoadingSpinner = () => (
    <div className='flex items-center justify-center p-8'>
      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400' />
    </div>
  );

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
        {/* Performance Metrics Cards Loading */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='bg-gray-800 rounded-lg p-4 animate-pulse'>
              <div className='h-3 bg-gray-700 rounded mb-2' />
              <div className='h-8 bg-gray-700 rounded' />
            </div>
          ))}
        </div>
        <LoadingSkeleton height='h-80' />
        <LoadingSkeleton height='h-96' />
      </div>
    );
  }

  function renderPolarAngleAxis({ payload, x, y, cx, cy, ...rest }: { payload: any; x: number; y: number; cx: number; cy: number; [key: string]: any }) {
    return (
      <Text
        {...rest}
        verticalAnchor='middle'
        y={y + (y - cy) / 8}
        x={x + (x - cx) / 8}
      >
        {payload.value}
      </Text>
    );
  }

  return (
    <div className='flex flex-col gap-6 w-full'>
      {/* Performance Metrics Cards */}
      <div className='flex justify-center'>
        <div className='grid grid-cols-2 gap-4 max-w-xl'>
          {performanceMetrics.map((metric, index) => (
            <div key={index} className='bg-gray-800 rounded-lg p-4 text-center'>
              <h3 className='text-sm text-gray-400 mb-1'>{metric.label}</h3>
              <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
              {metric.subtext && (
                <p className='text-xs text-gray-500 mt-1'>{metric.subtext}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Score History Chart */}
      <ProfileInsightsScoreChart user={user} timeFilter={timeFilter} />

      {/* Difficulty Conquest Map */}
      <div className='flex flex-col gap-2'>
        <h2 className='text-xl font-bold text-center'>Difficulty Conquest Map</h2>
        <p className='text-sm text-gray-400 text-center mb-4'>
          {user.name}&apos;s progression through different difficulty tiers
        </p>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {difficultyProgression.map((diff) => (
            <div key={diff.name} className='bg-gray-800 rounded-lg p-4 border-2' style={{ borderColor: diff.color }}>
              <h3 className='font-bold text-lg' style={{ color: diff.color }}>{diff.name}</h3>
              <div className='mt-2 space-y-1 text-sm'>
                <div>Levels conquered: <span className='font-bold'>{diff.levelCount}</span></div>
                {diff.firstSolved && (
                  <div className='text-xs text-gray-400'>
                    First: {diff.firstSolved}
                  </div>
                )}
                {diff.latestSolved && (
                  <div className='text-xs text-gray-400'>
                    Latest: {diff.latestSolved}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty Progression Timeline */}
      {difficultyTimeline.length > 1 && (
        <div className='flex flex-col gap-2'>
          <div className='flex items-center justify-between mb-2'>
            <h2 className='text-xl font-bold'>{timelineMode === 'average' ? 'Average' : 'Maximum'} Difficulty Over Time</h2>
            <select
              value={timelineMode}
              onChange={(e) => setTimelineMode(e.target.value as 'max' | 'average')}
              className='bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-400'
            >
              <option value='average'>Average Difficulty</option>
              <option value='max'>Maximum Difficulty</option>
            </select>
          </div>
          <p className='text-sm text-gray-400 text-center mb-4'>
            {timelineMode === 'average'
              ? 'Average difficulty of levels solved each month'
              : 'Highest difficulty level reached each month'
            }
            <span className='block text-xs text-gray-500 mt-1'>
              💡 Click on any data point to see the hardest levels solved that month
            </span>
          </p>
          <div className='w-full h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart
                data={difficultyTimeline}
                margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const payload = data.activePayload[0].payload;

                    setSelectedMonth(selectedMonth === payload.monthKey ? null : payload.monthKey);
                  }
                }}
              >
                <XAxis
                  dataKey='date'
                  tick={{ fill: '#9CA3AF' }}
                  interval='preserveStartEnd'
                />
                <YAxis
                  type='number'
                  domain={['dataMin - 50', 'dataMax + 50']}
                  tick={{ fill: '#9CA3AF' }}
                  tickFormatter={(value) => getDifficultyFromEstimate(value).name}
                  label={{ value: `${timelineMode === 'average' ? 'Avg' : 'Max'} Difficulty`, angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(31, 41, 55)',
                    border: '1px solid rgb(75, 85, 99)',
                    borderRadius: '0.5rem',
                    color: 'rgb(229, 231, 235)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    const data = props.payload;

                    return [
                      <div key='tooltip' className='text-sm'>
                        <div className='font-bold text-blue-400 mb-2'>{data.date}</div>
                        <div className='space-y-1'>
                          <div>{timelineMode === 'average' ? 'Average' : 'Maximum'} Difficulty:
                            <span className='font-bold text-green-400 ml-1'>{getDifficultyFromEstimate(value).name}</span>
                          </div>
                          <div>Levels solved this month: <span className='font-bold text-yellow-400'>{data.levelCount}</span></div>
                          {timelineMode === 'average' && data.maxDifficulty !== value && (
                            <div className='text-xs text-gray-400'>
                              Hardest level: {getDifficultyFromEstimate(data.maxDifficulty).name}
                            </div>
                          )}
                        </div>
                        <div className='text-xs text-blue-300 mt-2 pt-2 border-t border-gray-600'>
                          🖱️ Click to see the hardest levels from this month
                        </div>
                      </div>,
                      ''
                    ];
                  }}
                />
                <Line
                  type='monotone'
                  dataKey='avgDifficulty'
                  stroke='#3B82F6'
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4, cursor: 'pointer' }}
                  activeDot={{ r: 6, fill: '#60A5FA', cursor: 'pointer' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Selected Month Details */}
          {selectedMonthData && (
            <div className='mt-6 bg-gray-800 rounded-lg p-4'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='font-bold text-lg'>Most Difficult Levels Solved in {selectedMonthData.date}</h3>
                <button
                  onClick={() => setSelectedMonth(null)}
                  className='text-gray-400 hover:text-gray-200 text-xl'
                >
                  ×
                </button>
              </div>
              <p className='text-sm text-gray-400 mb-4'>
                Average Difficulty: <span className='text-blue-400 font-bold'>{selectedMonthData.difficulty}</span>
                (Rating: {selectedMonthData.difficultyRating.toFixed(0)}) •
                <span className='ml-2'>Levels Solved: <span className='text-green-400 font-bold'>{selectedMonthData.levelCount}</span></span>
              </p>
              <p className='text-xs text-gray-500 mb-3'>Showing the {Math.min(selectedMonthData.hardestLevels.length, 8)} hardest levels solved this month:</p>
              <div className='space-y-2'>
                {selectedMonthData.hardestLevels.slice(0, 8).map((level, index) => (
                  <div key={index} className='bg-gray-700 rounded-lg p-3 flex items-center justify-between'>
                    <div className='flex-1'>
                      <FormattedLevelLink
                        id={`selected-month-level-${index}`}
                        level={level}
                      />
                    </div>
                    <div className='text-right text-sm text-gray-400'>
                      <div>Difficulty: <span className='text-blue-400'>{getDifficultyFromEstimate(level.difficulty).name}</span></div>
                      <div>Solved: {dayjs(level.ts * 1000).tz(dayjs.tz.guess()).format('MMM Do h:mmA zzz')}</div>
                    </div>
                  </div>
                ))}
                {selectedMonthData.hardestLevels.length > 8 && (
                  <div className='text-center text-sm text-gray-500 pt-2'>
                    ...and {selectedMonthData.hardestLevels.length - 8} more levels solved this month
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Personal Records */}
      <ProfileInsightsRecords user={user} />

      {/* Skill Radar Chart - Removed */}
      {false && skillRadarData.length > 0 && (
        <div className='flex flex-col gap-2'>
          <h2 className='text-xl font-bold text-center'>Performance by Level Type</h2>
          <p className='text-sm text-gray-400 text-center mb-4'>
            How your solve times compare to your personal average, grouped by level mechanics and features.
            <span className='block text-xs text-gray-500 mt-1'>
              Only shows level types with 5+ levels solved • 100 = same as your average
            </span>
          </p>
          {skillRadarData.length > 0 && (
            <div className='flex flex-wrap justify-center gap-4 mb-4 text-xs'>
              <div className='flex items-center gap-1'>
                <div className='w-3 h-3 rounded-full' style={{ backgroundColor: '#10B981' }} />
                <span>Much better (130%+)</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-3 h-3 rounded-full' style={{ backgroundColor: '#3B82F6' }} />
                <span>Better (110%+)</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-3 h-3 rounded-full' style={{ backgroundColor: '#F59E0B' }} />
                <span>Similar (90-110%)</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-3 h-3 rounded-full' style={{ backgroundColor: '#EF4444' }} />
                <span>Worse (70-90%)</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-3 h-3 rounded-full' style={{ backgroundColor: '#6B7280' }} />
                <span>Much worse (&lt;70%)</span>
              </div>
            </div>
          )}
          <div className='w-full h-[500px]'>
            <ResponsiveContainer width='100%' height='100%'>
              <RadarChart data={skillRadarData} margin={{ top: 60, right: 80, bottom: 60, left: 80 }} >
                <defs>
                  <linearGradient id='performanceGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor={getPerformanceColor(averagePerformance)} stopOpacity={0.8} />
                    <stop offset='100%' stopColor={getPerformanceColor(averagePerformance)} stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <PolarGrid stroke='#374151' />
                <PolarAngleAxis
                  dataKey='difficulty'
                  stroke='#9CA3AF'

                  tick={renderPolarAngleAxis}
                  tickFormatter={(value) => value}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 200]}
                  tickCount={5}
                  stroke='#6B7280'
                  tickFormatter={(value) => `${value}%`}
                />
                <Radar
                  name={user.name}
                  dataKey='performance'
                  stroke={getPerformanceColor(averagePerformance, 100)}
                  fill={getPerformanceColor(averagePerformance, 100)}
                  fillOpacity={0.3}
                  strokeWidth={3}
                />
                <Radar
                  name='Your Average (100%)'
                  dataKey={() => 100}
                  stroke='lightblue'
                  fill='none'
                  strokeWidth={1}
                  strokeDasharray='3 10'
                  dot={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const entry = payload[0];

                      if (entry && entry.payload) {
                        const data = entry.payload;
                        const value = entry.value as number;

                        const performanceLevel = value >= 130 ? 'Much Better' :
                          value >= 110 ? 'Better' :
                            value >= 90 ? 'Similar' :
                              value >= 70 ? 'Worse' : 'Much Worse';

                        return (
                          <div className='bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-600'>
                            <div className='text-sm text-gray-100'>
                              <div className='flex items-center gap-2 mb-1'>
                                <div
                                  className='w-3 h-3 rounded-full'
                                  style={{ backgroundColor: data.color }}
                                />
                                <span className='font-bold'>{performanceLevel}</span>
                              </div>
                              <div>Performance vs your average: <span className='font-bold'>{value}%</span></div>
                              <div>Levels solved: <span className='font-bold'>{data.levelCount}</span></div>
                              <div className='text-gray-400 text-xs'>
                                Average time: {data.averageTime}s (your overall: {data.userOverallAverage}s)
                              </div>
                            </div>
                          </div>
                        );
                      }
                    }

                    return null;
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
