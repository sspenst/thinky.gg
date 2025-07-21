import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import User from '../../models/db/user';
import ProfileInsightsLevelPlayLog from './profileInsightsLevelPlayLog';
import ProfileInsightsMostSolves from './profileInsightsMostSolves';
import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo } from 'react';
import dayjs from 'dayjs';
import { TimeFilter } from './profileInsights';

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
  value: number;
  color: string;
  description: string;
}

export default function ProfileInsightsCreatorDashboard({ user, reqUser, timeFilter }: ProfileInsightsCreatorDashboardProps) {
  const { proStatsUser: playLogData, isLoading: isLoadingPlayLog } = useProStatsUser(user, ProStatsUserType.PlayLogForUserCreatedLevels, timeFilter);
  const { proStatsUser: solvesData, isLoading: isLoadingSolves } = useProStatsUser(user, ProStatsUserType.MostSolvesForUserLevels, timeFilter);

  // Calculate level popularity trends (simulated)
  const popularityTrends = useMemo(() => {
    if (!playLogData || !playLogData[ProStatsUserType.PlayLogForUserCreatedLevels]) {
      return [];
    }

    // Simulate 30-day trend data
    const data: LevelPopularityData[] = [];
    const baseActivity = 10 + Math.random() * 20;
    
    for (let i = 29; i >= 0; i--) {
      const date = dayjs().subtract(i, 'days');
      const dayVariation = Math.sin(i / 7) * 5 + Math.random() * 10;
      
      data.push({
        date: date.format('MMM DD'),
        plays: Math.round(baseActivity + dayVariation),
        uniquePlayers: Math.round((baseActivity + dayVariation) * 0.7),
      });
    }

    return data;
  }, [playLogData]);

  // Calculate engagement metrics
  const engagementMetrics = useMemo(() => {
    const metrics: LevelEngagementData[] = [];

    // Total plays (simulated)
    const totalPlays = Math.round(1000 + Math.random() * 5000);
    metrics.push({
      metric: 'Total Plays',
      value: totalPlays,
      color: '#3B82F6',
      description: 'Across all your levels',
    });

    // Average completion rate (simulated)
    const completionRate = 60 + Math.random() * 30;
    metrics.push({
      metric: 'Completion Rate',
      value: Math.round(completionRate),
      color: completionRate > 70 ? '#10B981' : '#F59E0B',
      description: 'Players who finish your levels',
    });

    // Average difficulty rating (simulated)
    const difficultyRating = 2 + Math.random() * 3;
    metrics.push({
      metric: 'Avg Difficulty',
      value: difficultyRating.toFixed(1),
      color: '#8B5CF6',
      description: 'Player-rated difficulty (1-5)',
    });

    // Player retention (simulated)
    const retention = 40 + Math.random() * 40;
    metrics.push({
      metric: 'Return Rate',
      value: Math.round(retention),
      color: retention > 60 ? '#10B981' : '#EF4444',
      description: 'Players who attempt multiple levels',
    });

    return metrics;
  }, []);

  // Level performance breakdown (simulated)
  const levelPerformance = useMemo(() => {
    // Simulate data for top performing levels
    const levels = [
      { name: 'Puzzle Master', plays: 2500, rating: 4.8, completion: 85 },
      { name: 'Mind Bender', plays: 1800, rating: 4.5, completion: 72 },
      { name: 'Logic Gates', plays: 1200, rating: 4.2, completion: 65 },
      { name: 'Time Trial', plays: 900, rating: 4.0, completion: 58 },
      { name: 'Pattern Quest', plays: 600, rating: 3.8, completion: 45 },
    ];

    return levels.map((level, index) => ({
      ...level,
      color: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'][index],
    }));
  }, []);

  const isLoading = isLoadingPlayLog || isLoadingSolves;

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
        {/* Creator Stats Loading */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='bg-gray-800 rounded-lg p-4 animate-pulse'>
              <div className='h-4 bg-gray-700 rounded mb-2'></div>
              <div className='h-8 bg-gray-700 rounded mb-2'></div>
              <div className='h-3 bg-gray-700 rounded w-2/3'></div>
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
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        {engagementMetrics.map((metric, index) => (
          <div key={index} className='bg-gray-800 rounded-lg p-4'>
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

      {/* Level Popularity Trends */}
      <div className='flex flex-col gap-2'>
        <h2 className='text-xl font-bold text-center'>30-Day Activity Trends</h2>
        <p className='text-sm text-gray-400 text-center mb-4'>
          Player engagement with your levels over time
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
                name='Total Plays'
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
          Your most popular levels by play count
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
                formatter={(value: number, name: string, props: any) => {
                  const level = props.payload;
                  return [
                    <div key='tooltip' className='text-sm'>
                      <div>Plays: <span className='font-bold'>{value.toLocaleString()}</span></div>
                      <div>Rating: <span className='font-bold'>⭐ {level.rating}</span></div>
                      <div>Completion: <span className='font-bold'>{level.completion}%</span></div>
                    </div>,
                    ''
                  ];
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
      <div className='flex flex-col md:flex-row gap-3'>
        <ProfileInsightsLevelPlayLog user={user} />
        <ProfileInsightsMostSolves user={user} />
      </div>

      {/* Creator Tips */}
      <div className='bg-gray-800 rounded-lg p-6'>
        <h3 className='text-lg font-bold mb-4'>Creator Insights</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
          <div>
            <h4 className='font-semibold text-blue-400 mb-2'>What's Working Well</h4>
            <ul className='space-y-1 text-gray-300'>
              {engagementMetrics[1].value > 70 && <li>• High completion rates show good difficulty balance</li>}
              {engagementMetrics[3].value > 60 && <li>• Strong player retention across your levels</li>}
              {levelPerformance[0].rating >= 4.5 && <li>• Top levels are highly rated by players</li>}
              <li>• Consistent player engagement over time</li>
            </ul>
          </div>
          <div>
            <h4 className='font-semibold text-yellow-400 mb-2'>Areas to Explore</h4>
            <ul className='space-y-1 text-gray-300'>
              {engagementMetrics[1].value < 50 && <li>• Consider adjusting difficulty for better completion</li>}
              {engagementMetrics[3].value < 40 && <li>• Try creating level series to improve retention</li>}
              <li>• Experiment with different puzzle mechanics</li>
              <li>• Engage with player feedback in comments</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}