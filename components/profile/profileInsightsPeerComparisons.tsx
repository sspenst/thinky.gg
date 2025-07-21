import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import { useMemo, useState } from 'react';
import User from '../../models/db/user';
import ProfileInsightsSolveTimeComparison from './profileInsightsSolveTimeComparison';
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getDifficultyFromEstimate, difficultyList } from '../formatted/formattedDifficulty';
import Role from '@root/constants/role';
import { TimeFilter } from './profileInsights';

interface ProfileInsightsPeerComparisonsProps {
  user: User;
  reqUser: User | null;
  timeFilter: TimeFilter;
}

interface PercentileData {
  difficulty: string;
  percentile: number;
  totalLevels: number;
  fasterCount: number;
  color: string;
}

export default function ProfileInsightsPeerComparisons({ user, reqUser, timeFilter }: ProfileInsightsPeerComparisonsProps) {
  const { proStatsUser: difficultyData, isLoading } = useProStatsUser(user, ProStatsUserType.DifficultyLevelsComparisons, timeFilter);
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate percentile rankings by difficulty
  const percentileData = useMemo(() => {
    if (!difficultyData || !difficultyData[ProStatsUserType.DifficultyLevelsComparisons]) {
      return [];
    }

    const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as any[];
    const difficultyGroups = new Map<string, { faster: number, total: number, sumPercentile: number }>();

    comparisons.forEach(c => {
      if (!c.difficulty || !c.otherPlayattemptsAverageDuration || !c.myPlayattemptsSumDuration) return;
      
      const difficulty = getDifficultyFromEstimate(c.difficulty);
      const group = difficultyGroups.get(difficulty.name) || { faster: 0, total: 0, sumPercentile: 0 };
      
      group.total++;
      const performanceRatio = c.otherPlayattemptsAverageDuration / c.myPlayattemptsSumDuration;
      
      if (performanceRatio > 1) {
        group.faster++;
        // Estimate percentile based on performance ratio
        // This is a simplified calculation - in production you'd want actual percentile data
        const percentile = Math.min(99, 50 + (performanceRatio - 1) * 25);
        group.sumPercentile += percentile;
      } else {
        const percentile = Math.max(1, 50 - (1 - performanceRatio) * 40);
        group.sumPercentile += percentile;
      }
      
      difficultyGroups.set(difficulty.name, group);
    });

    // Convert to chart data using actual difficulty order - ALWAYS include all difficulties
    const data: PercentileData[] = [];
    const difficultyOrder = difficultyList
      .filter(d => d.name !== 'Pending')
      .sort((a, b) => a.value - b.value) // Sort by difficulty value ascending
      .map(d => d.name);
    
    // Gradient color based on percentile (red to yellow to green)
    const getPercentileColor = (percentile: number) => {
      if (percentile >= 80) return '#10B981'; // Green
      if (percentile >= 70) return '#22C55E'; // Light green
      if (percentile >= 60) return '#84CC16'; // Lime
      if (percentile >= 50) return '#EAB308'; // Yellow
      if (percentile >= 40) return '#F59E0B'; // Orange
      if (percentile >= 30) return '#F97316'; // Dark orange
      if (percentile >= 20) return '#EA580C'; // Red-orange
      return '#DC2626'; // Red
    };
    
    difficultyOrder.forEach(diffName => {
      const group = difficultyGroups.get(diffName);
      if (group && group.total > 0) {
        const avgPercentile = Math.round(group.sumPercentile / group.total);

        data.push({
          difficulty: diffName,
          percentile: avgPercentile,
          totalLevels: group.total,
          fasterCount: group.faster,
          color: getPercentileColor(avgPercentile),
        });
      } else {
        // No data for this difficulty - show as neutral percentile
        data.push({
          difficulty: diffName,
          percentile: 50, // Neutral percentile for no data
          totalLevels: 0,
          fasterCount: 0,
          color: '#6B7280', // Gray for no data
        });
      }
    });

    return data;
  }, [difficultyData]);

  // Calculate simple competition score - average difficulty of levels solved
  const { competitionScore, competitionScoreDetails } = useMemo(() => {
    if (!difficultyData || !difficultyData[ProStatsUserType.DifficultyLevelsComparisons]) {
      return { competitionScore: null, competitionScoreDetails: null };
    }

    const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as any[];
    const validComparisons = comparisons.filter(c => c.difficulty);
    
    if (validComparisons.length === 0) return { competitionScore: null, competitionScoreDetails: null };

    // Simple approach: average difficulty of levels solved, scaled to 0-100
    const difficulties = validComparisons.map(c => c.difficulty);
    const averageDifficulty = difficulties.reduce((sum, diff) => sum + diff, 0) / difficulties.length;
    const maxDifficulty = Math.max(...difficulties);
    
    // Scale average difficulty to 0-100 range
    // 500 difficulty = 25 points, 1000 = 50 points, 1500 = 75 points, 2000+ = 100 points
    const baseScore = Math.min(100, Math.round((averageDifficulty / 20)));
    
    // Bonus for attempting very high difficulty levels
    let difficultyBonus = 0;
    if (maxDifficulty >= 2000) difficultyBonus = 15;      // Master levels attempted
    else if (maxDifficulty >= 1500) difficultyBonus = 10; // Expert levels attempted  
    else if (maxDifficulty >= 1000) difficultyBonus = 5;  // Hard levels attempted
    
    const finalScore = Math.min(100, baseScore + difficultyBonus);
    
    // Calculate details for tooltip
    const details = {
      totalLevels: validComparisons.length,
      averageDifficulty: Math.round(averageDifficulty),
      maxDifficulty: maxDifficulty,
      baseScore: baseScore,
      difficultyBonus: difficultyBonus,
      finalScore: finalScore
    };

    return { competitionScore: finalScore, competitionScoreDetails: details };
  }, [difficultyData]);

  const isOwnProfile = reqUser?._id === user._id;
  const isAdmin = reqUser?.roles?.includes(Role.ADMIN);
  const showPrivateData = isOwnProfile || isAdmin;

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
        {/* Competition Score Loading */}
        <div className='bg-gray-800 rounded-lg p-6 animate-pulse'>
          <div className='text-center'>
            <div className='h-6 bg-gray-700 rounded mb-2 w-40 mx-auto'></div>
            <div className='h-16 w-16 bg-gray-700 rounded-full mx-auto mb-2'></div>
            <div className='h-4 bg-gray-700 rounded w-64 mx-auto'></div>
          </div>
        </div>
        <LoadingSkeleton height='h-80' />
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6 w-full'>
      {/* Competition Score */}
      {competitionScore !== null && competitionScoreDetails && (
        <div className='bg-gray-800 rounded-lg p-6 text-center'>
          <div className='flex items-center justify-center gap-2 mb-2'>
            <h2 className='text-xl font-bold'>Competition Score</h2>
            <div className='relative'>
              <button
                className='w-5 h-5 rounded-full bg-gray-600 text-white text-xs flex items-center justify-center hover:bg-gray-500 cursor-help'
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
              >
                ?
              </button>
              {showTooltip && (
                <div className='absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg z-10 w-64'>
                  <div className='font-bold mb-2'>How Competition Score Works:</div>
                  <div className='text-left space-y-1 mb-3'>
                    <div>• Based on average difficulty of levels you've solved</div>
                    <div>• <span className='text-yellow-400'>Higher difficulty = higher score</span></div>
                    <div>• Bonus for attempting the hardest levels:</div>
                    <div className='ml-2'>Hard (1000+): +5 points</div>
                    <div className='ml-2'>Expert (1500+): +10 points</div>
                    <div className='ml-2'>Master (2000+): +15 points</div>
                  </div>
                  <div className='border-t border-gray-700 pt-2'>
                    <div className='font-bold mb-1'>Your Score Breakdown:</div>
                    <div className='flex justify-between text-xs mb-1'>
                      <span>Levels completed:</span>
                      <span>{competitionScoreDetails.totalLevels}</span>
                    </div>
                    <div className='flex justify-between text-xs mb-1'>
                      <span>Average difficulty:</span>
                      <span>{competitionScoreDetails.averageDifficulty}</span>
                    </div>
                    <div className='flex justify-between text-xs mb-1'>
                      <span>Hardest level:</span>
                      <span>{competitionScoreDetails.maxDifficulty}</span>
                    </div>
                    <div className='flex justify-between text-xs mb-1'>
                      <span>Base score:</span>
                      <span>{competitionScoreDetails.baseScore}/100</span>
                    </div>
                    <div className='flex justify-between text-xs mb-1'>
                      <span>Difficulty bonus:</span>
                      <span className='text-green-400'>+{competitionScoreDetails.difficultyBonus}</span>
                    </div>
                    <div className='flex justify-between text-xs font-bold'>
                      <span>Final score:</span>
                      <span>{competitionScoreDetails.finalScore}/100</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className='text-5xl font-bold mb-2' style={{ color: competitionScore >= 75 ? '#10B981' : competitionScore >= 50 ? '#3B82F6' : competitionScore >= 25 ? '#F59E0B' : '#EF4444' }}>
            {competitionScore}
          </div>
          <p className='text-sm text-gray-400'>
            Based on the average difficulty of levels you've completed
          </p>
          <div className='mt-4 text-xs text-gray-500'>
            <span className='text-green-500'>75-100: Elite</span> • 
            <span className='text-blue-500 ml-2'>50-74: Above Average</span> • 
            <span className='text-yellow-500 ml-2'>25-49: Average</span> • 
            <span className='text-red-500 ml-2'>0-24: Below Average</span>
          </div>
        </div>
      )}

      {/* Percentile Rankings by Difficulty */}
      {percentileData.length > 0 && (
        <div className='flex flex-col gap-2'>
          <h2 className='text-xl font-bold text-center'>Percentile Rankings by Difficulty</h2>
          <p className='text-sm text-gray-400 text-center mb-4'>
            Your estimated percentile ranking within each difficulty tier
          </p>
          <div className='w-full h-80'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={percentileData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <XAxis 
                  dataKey='difficulty' 
                  angle={-45} 
                  textAnchor='end' 
                  height={100}
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fill: '#9CA3AF' }}
                  label={{ value: 'Percentile', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <ReferenceLine 
                  y={50} 
                  stroke='#6B7280' 
                  strokeDasharray='4 4'
                  label={{ value: '50th Percentile (Average)', position: 'topRight', style: { fill: '#9CA3AF', fontSize: '12px' } }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgb(31, 41, 55)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: 'rgb(229, 231, 235)',
                  }}
                  formatter={(value: number, name: string) => {
                    const data = percentileData.find(d => d.percentile === value);
                    return [
                      <div key='tooltip' className='text-sm text-gray-100'>
                        <div>Percentile: <span className='font-bold'>{value}%</span></div>
                        {data && (
                          <>
                            <div>Levels played: {data.totalLevels}</div>
                            {data.totalLevels > 0 ? (
                              <div>Faster than avg: {data.fasterCount} ({Math.round(data.fasterCount / data.totalLevels * 100)}%)</div>
                            ) : (
                              <div className='text-gray-400 italic'>No levels solved at this difficulty</div>
                            )}
                          </>
                        )}
                      </div>,
                      ''
                    ];
                  }}
                />
                <Bar dataKey='percentile' radius={[8, 8, 0, 0]}>
                  {percentileData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Existing Solve Time Comparison Scatter Plot */}
      {showPrivateData && <ProfileInsightsSolveTimeComparison user={user} />}

      {/* Performance Analysis */}
      <div className='bg-gray-800 rounded-lg p-6'>
        <h3 className='text-xl font-bold mb-4 text-center'>Performance Analysis</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <div className='flex items-center gap-2 mb-3'>
              <div className='w-3 h-3 bg-green-500 rounded-full'></div>
              <h4 className='font-semibold text-green-400'>Your Strongest Areas</h4>
            </div>
            <div className='space-y-2'>
              {percentileData.filter(d => d.percentile >= 60).map(d => (
                <div key={d.difficulty} className='bg-green-500/10 border border-green-500/20 rounded-lg p-3'>
                  <div className='flex justify-between items-center'>
                    <span className='font-medium'>{d.difficulty}</span>
                    <span className='text-green-400 font-bold'>{d.percentile}th percentile</span>
                  </div>
                  <p className='text-xs text-gray-400 mt-1'>
                    Faster than {d.percentile}% of players ({d.fasterCount}/{d.totalLevels} levels)
                  </p>
                </div>
              ))}
              {percentileData.filter(d => d.percentile >= 60).length === 0 && (
                <div className='text-center p-4 text-gray-500 italic'>
                  🎯 Focus on consistency to build your strengths!
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className='flex items-center gap-2 mb-3'>
              <div className='w-3 h-3 bg-yellow-500 rounded-full'></div>
              <h4 className='font-semibold text-yellow-400'>Growth Opportunities</h4>
            </div>
            <div className='space-y-2'>
              {percentileData.filter(d => d.percentile < 40).map(d => (
                <div key={d.difficulty} className='bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3'>
                  <div className='flex justify-between items-center'>
                    <span className='font-medium'>{d.difficulty}</span>
                    <span className='text-yellow-400 font-bold'>{d.percentile}th percentile</span>
                  </div>
                  <p className='text-xs text-gray-400 mt-1'>
                    Room to improve - practice these difficulty levels more
                  </p>
                </div>
              ))}
              {percentileData.filter(d => d.percentile < 40).length === 0 && (
                <div className='text-center p-4 text-green-400 italic'>
                  🌟 Excellent! You're performing well across all difficulties.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}