import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import { useMemo } from 'react';
import User from '../../models/db/user';
import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';
import { getDifficultyFromEstimate, difficultyList } from '../formatted/formattedDifficulty';
import Role from '@root/constants/role';
import { DateAndSum } from '@root/contexts/levelContext';
import { TimeFilter } from './profileInsights';

interface ProfileInsightsTimeAnalyticsProps {
  user: User;
  reqUser: User | null;
  timeFilter: TimeFilter;
}

interface HeatmapData {
  day: string;
  hour: number;
  count: number;
  avgTime: number;
}

interface TimeInvestmentData {
  difficulty: string;
  totalTime: number;
  levelCount: number;
  avgTimePerLevel: number;
  color: string;
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

  // Calculate time investment by difficulty
  const timeInvestmentData = useMemo(() => {
    if (!difficultyData || !difficultyData[ProStatsUserType.DifficultyLevelsComparisons]) {
      return [];
    }

    const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as any[];
    const difficultyGroups = new Map<string, { totalTime: number, count: number, maxDiff: number }>();

    comparisons.forEach(c => {
      if (!c.difficulty || !c.myPlayattemptsSumDuration) return;
      
      const difficulty = getDifficultyFromEstimate(c.difficulty);
      const group = difficultyGroups.get(difficulty.name) || { totalTime: 0, count: 0, maxDiff: 0 };
      
      group.totalTime += c.myPlayattemptsSumDuration;
      group.count++;
      group.maxDiff = Math.max(group.maxDiff, c.difficulty);
      
      difficultyGroups.set(difficulty.name, group);
    });

    // Convert to chart data using difficulty order from constants
    const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#DC2626', '#991B1B', '#6B7280', '#374151'];
    const orderedData = difficultyList
      .filter(d => d.name !== 'Pending')
      .map((d, index) => {
        const group = difficultyGroups.get(d.name);
        if (group && group.count > 0) {
          return {
            difficulty: d.name,
            totalTime: Math.round(group.totalTime / 60), // Convert to minutes
            levelCount: group.count,
            avgTimePerLevel: Math.round(group.totalTime / group.count),
            color: colors[index % colors.length],
          };
        }
        return null;
      })
      .filter(Boolean) as TimeInvestmentData[];
    
    return orderedData;
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

  // Monthly activity trend
  const monthlyTrend = useMemo(() => {
    if (!scoreHistory || !scoreHistory[ProStatsUserType.ScoreHistory]) {
      return [];
    }

    const history = scoreHistory[ProStatsUserType.ScoreHistory] as DateAndSum[];
    
    if (!history || history.length === 0) {
      return [];
    }
    
    // Sort by date and take last 30 entries
    const sortedHistory = history
      .map(entry => ({
        ...entry,
        parsedDate: dayjs(entry.date)
      }))
      .sort((a, b) => a.parsedDate.unix() - b.parsedDate.unix())
      .slice(-30);
    
    let cumulativeSum = 0;
    return sortedHistory.map(entry => {
      cumulativeSum += entry.sum;
      return {
        date: entry.parsedDate.format('MMM DD'),
        solves: entry.sum,
        cumulative: cumulativeSum,
      };
    });
  }, [scoreHistory]);

  // Time-of-day performance analysis
  const timeOfDayPerformance = useMemo(() => {
    if (!difficultyData || !difficultyData[ProStatsUserType.DifficultyLevelsComparisons]) {
      return null;
    }

    const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as any[];
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

    // Group by time periods
    const timeGroups = {
      'Morning (6-12)': { total: 0, sumRatio: 0, count: 0 },
      'Afternoon (12-18)': { total: 0, sumRatio: 0, count: 0 },
      'Evening (18-24)': { total: 0, sumRatio: 0, count: 0 },
      'Late Night (0-6)': { total: 0, sumRatio: 0, count: 0 },
    };

    validComparisons.forEach(c => {
      const date = new Date(c.ts * 1000);
      const hour = date.getHours();
      const performanceRatio = c.otherPlayattemptsAverageDuration / c.myPlayattemptsSumDuration;
      
      let period: keyof typeof timeGroups;
      if (hour >= 6 && hour < 12) period = 'Morning (6-12)';
      else if (hour >= 12 && hour < 18) period = 'Afternoon (12-18)';
      else if (hour >= 18 && hour < 24) period = 'Evening (18-24)';
      else period = 'Late Night (0-6)';

      timeGroups[period].count++;
      timeGroups[period].sumRatio += performanceRatio;
    });

    // Calculate averages and relative performance
    const timeData = Object.entries(timeGroups)
      .filter(([_, data]) => data.count > 0)
      .map(([period, data]) => {
        const avgRatio = data.sumRatio / data.count;
        const relativePerformance = (avgRatio / overallAvgRatio - 1) * 100; // Percentage better/worse than own average
        
        // Color code based on relative performance
        let color = '#6B7280'; // Default gray
        if (relativePerformance > 10) color = '#10B981'; // Green - much better
        else if (relativePerformance > 5) color = '#22C55E'; // Light green - better
        else if (relativePerformance > 0) color = '#84CC16'; // Lime - slightly better
        else if (relativePerformance > -5) color = '#F59E0B'; // Orange - slightly worse
        else if (relativePerformance > -10) color = '#F97316'; // Dark orange - worse
        else color = '#DC2626'; // Red - much worse

        return {
          period,
          avgPerformance: avgRatio,
          relativePerformance,
          levelCount: data.count,
          color,
          isBetter: relativePerformance > 0,
        };
      })
      .sort((a, b) => {
        // Sort by time order: Morning, Afternoon, Evening, Late Night
        const order = ['Morning (6-12)', 'Afternoon (12-18)', 'Evening (18-24)', 'Late Night (0-6)'];
        return order.indexOf(a.period) - order.indexOf(b.period);
      });

    return {
      data: timeData,
      timezone: userTimezone,
      overallAverage: overallAvgRatio,
    };
  }, [difficultyData]);

  const isOwnProfile = reqUser?._id === user._id;
  const isAdmin = reqUser?.roles?.includes(Role.ADMIN);
  const isLoading = isLoadingScoreHistory || isLoadingDifficulty;

  // Loading components
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
        <h2 className='text-xl font-bold text-center'>Time Investment by Difficulty</h2>
        <p className='text-sm text-gray-400 text-center mb-4'>
          Total time spent solving levels in each difficulty tier
        </p>
        <div className='w-full h-80'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={timeInvestmentData} margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
              <XAxis 
                dataKey='difficulty' 
                angle={-45} 
                textAnchor='end'
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis 
                tick={{ fill: '#9CA3AF' }}
                label={{ value: 'Time (minutes)', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgb(31, 41, 55)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'rgb(229, 231, 235)',
                }}
                formatter={(value: number, name: string) => {
                  const data = timeInvestmentData.find(d => d.totalTime === value);
                  return [
                    <div key='tooltip' className='text-sm text-gray-100'>
                      <div>Total time: <span className='font-bold'>{value} min</span></div>
                      {data && (
                        <>
                          <div>Levels played: {data.levelCount}</div>
                          <div>Avg per level: {Math.round(data.avgTimePerLevel)} sec</div>
                        </>
                      )}
                    </div>,
                    ''
                  ];
                }}
              />
              <Bar dataKey='totalTime' radius={[8, 8, 0, 0]}>
                {timeInvestmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time-of-Day Performance Analysis */}
      {timeOfDayPerformance && (
        <div className='flex flex-col gap-2'>
          <h2 className='text-xl font-bold text-center'>Performance by Time of Day</h2>
          <p className='text-sm text-gray-400 text-center mb-2'>
            When do you perform best compared to your own average?
          </p>
          <p className='text-xs text-gray-500 text-center mb-4'>
            Timezone: {timeOfDayPerformance.timezone}
          </p>
          <div className='w-full h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={timeOfDayPerformance.data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <XAxis 
                  dataKey='period' 
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis 
                  tick={{ fill: '#9CA3AF' }}
                  label={{ value: 'Performance vs Your Average (%)', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgb(31, 41, 55)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: 'rgb(229, 231, 235)',
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    const data = props.payload;
                    return [
                      <div key='tooltip' className='text-sm text-gray-100'>
                        <div>
                          {data.isBetter ? '✨ ' : ''}
                          {Math.abs(value).toFixed(1)}% {data.isBetter ? 'better' : 'worse'} than your average
                        </div>
                        <div>Levels played: <span className='font-bold'>{data.levelCount}</span></div>
                        <div>Performance ratio: <span className='font-bold'>{data.avgPerformance.toFixed(2)}x</span></div>
                      </div>,
                      ''
                    ];
                  }}
                />
                <Bar dataKey='relativePerformance' radius={[8, 8, 0, 0]}>
                  {timeOfDayPerformance.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className='bg-gray-800 rounded-lg p-4 mt-2'>
            <h3 className='font-bold mb-2 text-center'>Performance Legend</h3>
            <div className='flex flex-wrap gap-4 justify-center text-xs'>
              <div className='flex items-center gap-1'>
                <div className='w-3 h-3 bg-green-500 rounded'></div>
                <span>Much better (+10%+)</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-3 h-3 bg-lime-500 rounded'></div>
                <span>Better (0-10%)</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-3 h-3 bg-orange-500 rounded'></div>
                <span>Worse (0-10%)</span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-3 h-3 bg-red-500 rounded'></div>
                <span>Much worse (-10%+)</span>
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
                contentStyle={{
                  backgroundColor: 'rgb(31, 41, 55)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'rgb(229, 231, 235)',
                }}
                formatter={(value: number, name: string, props: any) => {
                  const data = props.payload;
                  return [
                    <div key='tooltip' className='text-sm text-gray-100'>
                      <div>Avg levels per day: <span className='font-bold'>{value.toFixed(1)}</span></div>
                      <div>Total levels solved: <span className='font-bold'>{data.totalSolves}</span></div>
                      <div>Days active: <span className='font-bold'>{data.daysActive}</span></div>
                    </div>,
                    ''
                  ];
                }}
              />
              <Bar dataKey='avgSolves' fill='#3B82F6' radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Activity Trend */}
      {monthlyTrend.length > 0 && (
        <div className='flex flex-col gap-2'>
          <h2 className='text-xl font-bold text-center'>30-Day Activity Trend</h2>
          <div className='w-full h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
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
                  dataKey='solves' 
                  stroke='#3B82F6' 
                  fill='#3B82F6' 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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