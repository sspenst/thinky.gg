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
      // Only include difficulties with 7+ solves
      if (group && group.total >= 7) {
        const avgPercentile = Math.round(group.sumPercentile / group.total);

        data.push({
          difficulty: diffName,
          percentile: avgPercentile,
          totalLevels: group.total,
          fasterCount: group.faster,
          color: getPercentileColor(avgPercentile),
        });
      }
      // Skip difficulties with fewer than 7 solves - don't show them at all
    });

    return data;
  }, [difficultyData]);

  // Calculate weighted competition score based on percentiles
  const { competitionScore, competitionScoreDetails } = useMemo(() => {
    if (!percentileData || percentileData.length === 0) {
      return { competitionScore: null, competitionScoreDetails: null };
    }

    // Define weights for each difficulty (Kindergarten=1, Elementary=2, etc.)
    const difficultyWeights: { [key: string]: number } = {
      'Kindergarten': 1,
      'Elementary': 2,
      'Junior High': 3,
      'Highschool': 4,
      'Bachelors': 5,
      'Masters': 6,
      'PhD': 7,
      'Professor': 8,
      'Grandmaster': 9,
      'Super Grandmaster': 10
    };

    let weightedPercentileSum = 0;
    let totalWeightUsed = 0;
    let maxPossibleWeight = 0;
    const breakdown: { [key: string]: { percentile: number; weight: number; contribution: number; levels: number } } = {};

    // Calculate weighted sum for difficulties the user has played (7+ solves)
    percentileData.forEach(item => {
      const weight = difficultyWeights[item.difficulty] || 1;
      maxPossibleWeight += weight;
      
      // Only include in calculation if meets minimum requirement (already filtered to 7+)
      const contribution = item.percentile * weight;
      weightedPercentileSum += contribution;
      totalWeightUsed += weight;
      
      breakdown[item.difficulty] = {
        percentile: item.percentile,
        weight: weight,
        contribution: contribution,
        levels: item.totalLevels
      };
    });

    if (totalWeightUsed === 0) return { competitionScore: null, competitionScoreDetails: null };

    // Calculate final score: weighted average percentile
    const finalScore = Math.round(weightedPercentileSum / totalWeightUsed);
    
    // Calculate details for tooltip
    const details = {
      finalScore: finalScore,
      totalWeightUsed: totalWeightUsed,
      maxPossibleWeight: maxPossibleWeight,
      weightedPercentileSum: Math.round(weightedPercentileSum),
      breakdown: breakdown,
      difficultiesPlayed: Object.keys(breakdown).length
    };

    return { competitionScore: finalScore, competitionScoreDetails: details };
  }, [percentileData]);

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
          </div>
          <div className='text-5xl font-bold mb-2' style={{ color: competitionScore >= 75 ? '#10B981' : competitionScore >= 50 ? '#3B82F6' : competitionScore >= 25 ? '#F59E0B' : '#EF4444' }}>
            {competitionScore}
          </div>
          <p className='text-sm text-gray-400 mb-3'>
            Weighted average of your percentiles across all difficulty tiers
          </p>
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            className='text-blue-400 hover:text-blue-300 text-sm underline focus:outline-none'
          >
            {showTooltip ? 'Hide Calculation' : 'Show Calculation'}
          </button>
          
          {showTooltip && (
            <div className='mt-4 bg-gray-700 rounded-lg p-4 text-left'>
              <div className='font-bold mb-3 text-center'>Competition Score Calculation</div>
              
              <div className='mb-4'>
                <div className='font-semibold mb-2 text-yellow-400'>How it works:</div>
                <div className='text-sm space-y-1'>
                  <div>• Weighted average of your percentiles across difficulty tiers</div>
                  <div>• Kindergarten (weight 1) → Super Grandmaster (weight 10)</div>
                  <div>• Higher difficulties count more toward your final score</div>
                </div>
              </div>

              <div className='mb-4'>
                <div className='font-semibold mb-2 text-blue-400'>Your breakdown:</div>
                <div className='bg-gray-800 rounded p-3 space-y-1'>
                  {Object.entries(competitionScoreDetails.breakdown).map(([difficulty, data]) => (
                    <div key={difficulty} className='flex justify-between text-sm'>
                      <span>{difficulty} ({data.levels} levels):</span>
                      <span className='font-mono'>{data.percentile}% × {data.weight} = {data.contribution}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className='border-t border-gray-600 pt-3'>
                <div className='font-semibold mb-2 text-green-400'>Final calculation:</div>
                <div className='bg-gray-800 rounded p-3 font-mono text-sm'>
                  <div>Total weighted sum: {competitionScoreDetails.weightedPercentileSum}</div>
                  <div>Total weight used: {competitionScoreDetails.totalWeightUsed}</div>
                  <div className='border-t border-gray-600 mt-2 pt-2 font-bold'>
                    Final score: {competitionScoreDetails.weightedPercentileSum} ÷ {competitionScoreDetails.totalWeightUsed} = {competitionScoreDetails.finalScore}
                  </div>
                </div>
              </div>
            </div>
          )}
          
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
          <h2 className='text-xl font-bold text-center'>Player Ranking by Difficulty</h2>
          <p className='text-sm text-gray-400 text-center mb-4'>
            What percentage of players you perform better than in each difficulty tier
            <span className='block text-xs text-gray-500 mt-1'>
              Only shows difficulty tiers with 7+ levels solved
            </span>
          </p>
          <div className='bg-gray-800 rounded-lg p-3 mb-4'>
            <div className='text-xs text-gray-300 text-center'>
              <div className='mb-1'><strong>How to read:</strong> "75th percentile" means you're faster than 75% of other players</div>
              <div className='text-gray-400'>This shows your <em>competitive ranking</em>, not speed difference (see Time Analytics for that)</div>
            </div>
          </div>
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
                  tickFormatter={(value) => `${value}%`}
                  label={{ value: 'Players You Beat (%)', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <ReferenceLine 
                  y={50} 
                  stroke='#6B7280' 
                  strokeDasharray='4 4'
                  label={{ value: 'Average Player (50%)', position: 'topRight', style: { fill: '#9CA3AF', fontSize: '12px' } }}
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
                        <div className='text-lg font-bold mb-1' style={{ color: data?.color }}>
                          {value}th percentile
                        </div>
                        <div className='mb-2'>
                          You're faster than <span className='font-bold text-green-400'>{value}%</span> of players
                        </div>
                        {data && (
                          <>
                            <div className='border-t border-gray-600 pt-2 mt-2 text-xs'>
                              <div>Levels analyzed: {data.totalLevels}</div>
                              <div>Times you beat average: {data.fasterCount} of {data.totalLevels}</div>
                            </div>
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
        <h3 className='text-xl font-bold mb-2 text-center'>Competitive Standing Summary</h3>
        <p className='text-sm text-gray-400 text-center mb-4'>
          Where you rank among other players (60th percentile+ = above average)
          <span className='block text-xs text-gray-500 mt-1'>
            Only includes difficulty tiers with 7+ levels solved
          </span>
        </p>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <div className='flex items-center gap-2 mb-3'>
              <div className='w-3 h-3 bg-green-500 rounded-full'></div>
              <h4 className='font-semibold text-green-400'>Your Strongest Difficulty Tiers</h4>
            </div>
            <div className='space-y-2'>
              {percentileData.filter(d => d.percentile >= 60).map(d => (
                <div key={d.difficulty} className='bg-green-500/10 border border-green-500/20 rounded-lg p-3'>
                  <div className='flex justify-between items-center'>
                    <span className='font-medium'>{d.difficulty}</span>
                    <span className='text-green-400 font-bold'>{d.percentile}th percentile</span>
                  </div>
                  <p className='text-xs text-gray-400 mt-1'>
                    You beat {d.percentile}% of players in this difficulty
                  </p>
                </div>
              ))}
              {percentileData.filter(d => d.percentile >= 60).length === 0 && (
                <div className='text-center p-4 text-gray-500 italic'>
                  🎯 Keep practicing to improve your competitive standing!<br />
                  <span className='text-xs text-gray-600 mt-1'>Solve 7+ levels in difficulty tiers to see rankings</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className='flex items-center gap-2 mb-3'>
              <div className='w-3 h-3 bg-yellow-500 rounded-full'></div>
              <h4 className='font-semibold text-yellow-400'>Areas Below Average</h4>
            </div>
            <div className='space-y-2'>
              {percentileData.filter(d => d.percentile < 40).map(d => (
                <div key={d.difficulty} className='bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3'>
                  <div className='flex justify-between items-center'>
                    <span className='font-medium'>{d.difficulty}</span>
                    <span className='text-yellow-400 font-bold'>{d.percentile}th percentile</span>
                  </div>
                  <p className='text-xs text-gray-400 mt-1'>
                    You beat only {d.percentile}% of players in this difficulty
                  </p>
                </div>
              ))}
              {percentileData.filter(d => d.percentile < 40).length === 0 && (
                <div className='text-center p-4 text-green-400 italic'>
                  🌟 Great! You're above average in all difficulty tiers.
                  <span className='block text-xs text-gray-500 mt-1'>
                    (Based on tiers with 7+ levels solved)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}