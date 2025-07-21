import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import { useContext, useMemo } from 'react';
import User from '../../models/db/user';
import ProfileInsightsScoreChart from './profileInsightsScoreChart';
import { AppContext } from '@root/contexts/appContext';
import { GameType } from '@root/constants/Games';
import { Area, AreaChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { getDifficultyFromEstimate } from '../formatted/formattedDifficulty';
import { TimeFilter } from './profileInsights';

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

export default function ProfileInsightsPerformanceOverview({ user, reqUser, timeFilter }: ProfileInsightsPerformanceOverviewProps) {
  const { game } = useContext(AppContext);
  const { proStatsUser: difficultyData, isLoading: isLoadingDifficulty } = useProStatsUser(user, ProStatsUserType.DifficultyLevelsComparisons, timeFilter);
  const { proStatsUser: scoreHistory, isLoading: isLoadingScoreHistory } = useProStatsUser(user, ProStatsUserType.ScoreHistory, timeFilter);

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    const metrics: PerformanceMetric[] = [];

    // Total solves
    metrics.push({
      label: 'Total Solves',
      value: user.score || 0,
      color: 'text-blue-400',
    });

    // Current streak
    if (user.calc_streak_days && user.calc_streak_days > 0) {
      metrics.push({
        label: 'Current Streak',
        value: `${user.calc_streak_days} days`,
        color: 'text-orange-400',
      });
    }

    // Max streak
    if (user.calc_max_streak_days && user.calc_max_streak_days > 0) {
      metrics.push({
        label: 'Best Streak',
        value: `${user.calc_max_streak_days} days`,
        color: 'text-purple-400',
      });
    }

    // Average performance vs peers
    if (difficultyData && difficultyData[ProStatsUserType.DifficultyLevelsComparisons]) {
      const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as any[];
      const validComparisons = comparisons.filter(c => c.otherPlayattemptsAverageDuration && c.myPlayattemptsSumDuration);
      
      if (validComparisons.length > 0) {
        const avgPerformance = validComparisons.reduce((sum, c) => 
          sum + (c.otherPlayattemptsAverageDuration / c.myPlayattemptsSumDuration), 0
        ) / validComparisons.length;
        
        metrics.push({
          label: 'Speed vs Average',
          value: avgPerformance >= 1 ? `${avgPerformance.toFixed(1)}x faster` : `${(1/avgPerformance).toFixed(1)}x slower`,
          color: avgPerformance >= 1 ? 'text-green-400' : 'text-red-400',
        });
      }
    }

    return metrics;
  }, [user, difficultyData]);

  // Calculate skill radar data
  const skillRadarData = useMemo(() => {
    if (!difficultyData || !difficultyData[ProStatsUserType.DifficultyLevelsComparisons]) {
      return [];
    }

    const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as any[];
    const difficultyBuckets = new Map<string, { faster: number, total: number, maxDifficulty: number, hasComparison: boolean }>();

    // First pass: collect all difficulty levels solved, even without comparison data
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

    // Convert to radar chart format - show all difficulty levels
    const radarData = Array.from(difficultyBuckets.entries())
      .sort((a, b) => a[1].maxDifficulty - b[1].maxDifficulty)
      .map(([difficulty, data]) => ({
        difficulty,
        performance: data.hasComparison && data.total > 0 
          ? Math.round((data.faster / data.total) * 100)
          : 50, // Default to 50% if no comparison data available
        fullMark: 100,
        hasData: data.hasComparison,
        levelCount: data.total,
      }));

    return radarData;
  }, [difficultyData]);

  const isOwnProfile = reqUser?._id === user._id;
  const isLoading = isLoadingDifficulty || isLoadingScoreHistory;

  // Loading components
  const LoadingSpinner = () => (
    <div className='flex items-center justify-center p-8'>
      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400'></div>
    </div>
  );

  const LoadingSkeleton = ({ height = 'h-64' }: { height?: string }) => (
    <div className={`bg-gray-800 rounded-lg animate-pulse ${height}`}>
      <div className='p-4 space-y-2'>
        <div className='h-4 bg-gray-700 rounded w-3/4'></div>
        <div className='h-4 bg-gray-700 rounded w-1/2'></div>
        <div className='h-4 bg-gray-700 rounded w-2/3'></div>
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
              <div className='h-3 bg-gray-700 rounded mb-2'></div>
              <div className='h-8 bg-gray-700 rounded'></div>
            </div>
          ))}
        </div>
        <LoadingSkeleton height='h-80' />
        <LoadingSkeleton height='h-96' />
      </div>
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
            Percentage of levels solved faster than average by difficulty tier.
            {skillRadarData.some(d => !d.hasData) && (
              <span className='block text-xs text-yellow-400 mt-1'>
                Some areas show 50% (gray) when comparison data is limited
              </span>
            )}
          </p>
          <div className='w-full h-96'>
            <ResponsiveContainer width='100%' height='100%'>
              <RadarChart data={skillRadarData} margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                <PolarGrid stroke='#374151' />
                <PolarAngleAxis 
                  dataKey='difficulty' 
                  stroke='#9CA3AF'
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  stroke='#6B7280'
                  tickFormatter={(value) => `${value}%`}
                />
                <Radar 
                  name={user.name} 
                  dataKey='performance' 
                  stroke='#3B82F6' 
                  fill='#3B82F6' 
                  fillOpacity={0.6}
                />
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => {
                    const data = props.payload;
                    return [
                      <div key='tooltip' className='text-sm text-gray-100'>
                        <div>Performance: <span className='font-bold'>{value}%</span></div>
                        <div>Levels played: <span className='font-bold'>{data.levelCount}</span></div>
                        {!data.hasData && (
                          <div className='text-yellow-400 text-xs mt-1'>
                            Limited comparison data available
                          </div>
                        )}
                      </div>,
                      ''
                    ];
                  }}
                  contentStyle={{
                    backgroundColor: 'rgb(31, 41, 55)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: 'rgb(229, 231, 235)',
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