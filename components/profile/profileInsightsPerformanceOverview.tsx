import { AppContext } from '@root/contexts/appContext';
import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import { useContext, useMemo } from 'react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Text, Tooltip } from 'recharts';
import User from '../../models/db/user';
import { getDifficultyFromEstimate } from '../formatted/formattedDifficulty';
import { TimeFilter } from './profileInsights';
import { DifficultyLevelComparison } from './profileInsightsSolveTimeComparison';
import ProfileInsightsScoreChart from './profileInsightsScoreChart';

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

// Color function for performance percentiles
function getPerformanceColor(performance: number): string {
  if (performance >= 80) return '#10B981'; // green-500 - Excellent
  if (performance >= 65) return '#3B82F6'; // blue-500 - Good
  if (performance >= 50) return '#F59E0B'; // amber-500 - Average
  if (performance >= 35) return '#EF4444'; // red-500 - Below average

  return '#6B7280'; // gray-500 - Poor
}

export default function ProfileInsightsPerformanceOverview({ user, reqUser, timeFilter }: ProfileInsightsPerformanceOverviewProps) {
  const { game: _game } = useContext(AppContext);
  const { proStatsUser: difficultyData, isLoading: isLoadingDifficulty } = useProStatsUser(user, ProStatsUserType.DifficultyLevelsComparisons, timeFilter);
  const { proStatsUser: _scoreHistory, isLoading: isLoadingScoreHistory } = useProStatsUser(user, ProStatsUserType.ScoreHistory, timeFilter);

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

      if (validComparisons.length > 0) {
        const avgPerformance = validComparisons.reduce((sum, c) =>
          sum + (c.otherPlayattemptsAverageDuration / c.myPlayattemptsSumDuration), 0
        ) / validComparisons.length;

        metrics.push({
          label: 'Speed vs Average',
          value: avgPerformance >= 1 ? `${avgPerformance.toFixed(1)}x faster` : `${(1 / avgPerformance).toFixed(1)}x slower`,
          color: avgPerformance >= 1 ? 'text-green-400' : 'text-red-400',
        });
      }
    }

    return metrics;
  }, [user, difficultyData]);

  // Calculate skill radar data with performance colors and minimum level requirement
  const { skillRadarData, averagePerformance } = useMemo(() => {
    if (!difficultyData || !difficultyData[ProStatsUserType.DifficultyLevelsComparisons]) {
      return { skillRadarData: [], averagePerformance: 50 };
    }

    const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as DifficultyLevelComparison[];
    const difficultyBuckets = new Map<string, { faster: number, total: number, maxDifficulty: number, hasComparison: boolean }>();

    // Collect difficulty levels solved with minimum threshold requirement
    comparisons.forEach(c => {
      if (!c.difficulty) return;

      const difficulty = getDifficultyFromEstimate(c.difficulty);
      const bucket = difficultyBuckets.get(difficulty.name) || {
        faster: 0,
        total: 0,
        maxDifficulty: 0,
        hasComparison: false
      };

      bucket.total++;
      bucket.maxDifficulty = Math.max(bucket.maxDifficulty, c.difficulty);

      // Only count performance comparison if we have the required data
      if (c.otherPlayattemptsAverageDuration && c.myPlayattemptsSumDuration) {
        bucket.hasComparison = true;

        if (c.myPlayattemptsSumDuration < c.otherPlayattemptsAverageDuration) {
          bucket.faster++;
        }
      }

      difficultyBuckets.set(difficulty.name, bucket);
    });

    // Convert to radar chart format - only include difficulties with 7+ solves
    const radarData = Array.from(difficultyBuckets.entries())
      .filter(([_difficulty, data]) => data.total >= 7) // Only include 7+ solves
      .sort((a, b) => a[1].maxDifficulty - b[1].maxDifficulty)
      .map(([difficulty, data]) => {
        const performance = data.hasComparison && data.total > 0
          ? Math.round((data.faster / data.total) * 100)
          : 50;

        return {
          difficulty,
          performance: performance,
          fullMark: 100,
          hasData: data.hasComparison,
          levelCount: data.total,
          meetsMinimum: true, // All entries now meet minimum by definition
          // Add color based on performance
          color: getPerformanceColor(performance),
        };
      });

    // Calculate average performance for overall color
    const avgPerf = radarData.length > 0
      ? radarData.reduce((sum, item) => sum + (item.performance || 0), 0) / radarData.length
      : 50;

    return { skillRadarData: radarData, averagePerformance: avgPerf };
  }, [difficultyData]);

  const _isOwnProfile = reqUser?._id === user._id;
  const isLoading = isLoadingDifficulty || isLoadingScoreHistory;

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
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
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
      {/* Score History Chart */}
      <ProfileInsightsScoreChart user={user} />
      {/* Skill Radar Chart */}
      {skillRadarData.length > 0 && (
        <div className='flex flex-col gap-2'>
          <h2 className='text-xl font-bold text-center'>Performance by Difficulty</h2>
          <p className='text-sm text-gray-400 text-center mb-4'>
            Percentage of levels solved faster than average by difficulty tier. Colors indicate performance level.
            <span className='block text-xs text-gray-500 mt-1'>
              Only shows difficulty tiers with 7+ levels solved
            </span>
            {skillRadarData.some(d => !d.hasData) && (
              <span className='block text-xs text-yellow-400 mt-1'>
                Some areas show 50% when comparison data is limited
              </span>
            )}
          </p>
          {skillRadarData.length > 0 && (
            <div className='flex flex-wrap justify-center gap-4 mb-4 text-xs'>
              <div className='flex items-center gap-1'>
                <div className='w-3 h-3 rounded-full' style={{ backgroundColor: '#10B981' }} />
                <span>Excellent (80%+)</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-3 h-3 rounded-full' style={{ backgroundColor: '#3B82F6' }} />
                <span>Good (65%+)</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-3 h-3 rounded-full' style={{ backgroundColor: '#F59E0B' }} />
                <span>Average (50%+)</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-3 h-3 rounded-full' style={{ backgroundColor: '#EF4444' }} />
                <span>Below Avg (35%+)</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-3 h-3 rounded-full' style={{ backgroundColor: '#6B7280' }} />
                <span>Poor (&lt;35%)</span>
              </div>
            </div>
          )}
          <div className='w-full h-96'>
            <ResponsiveContainer width='100%' height='100%'>
              <RadarChart data={skillRadarData} margin={{ top: 40, right: 40, bottom: 40, left: 40 }} >
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
                  domain={[0, 100]}
                  tickCount={3}

                  stroke='#6B7280'
                  tickFormatter={(value) => `${value}%`}
                />
                <Radar
                  name={user.name}
                  dataKey='performance'
                  stroke={getPerformanceColor(averagePerformance)}
                  fill='none'
                  fillOpacity={0.8}
                  strokeWidth={2}
                />
                <Radar
                  name='Average (50%)'
                  dataKey={() => 50}
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

                        const performanceLevel = value >= 80 ? 'Excellent' :
                          value >= 65 ? 'Good' :
                            value >= 50 ? 'Average' :
                              value >= 35 ? 'Below Average' : 'Poor';

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
                              <div>Performance: <span className='font-bold'>{value}%</span></div>
                              <div>Levels solved: <span className='font-bold'>{data.levelCount}</span></div>
                              {!data.hasData && (
                                <div className='text-yellow-400 text-xs mt-1'>
                                  Limited comparison data available
                                </div>
                              )}
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
