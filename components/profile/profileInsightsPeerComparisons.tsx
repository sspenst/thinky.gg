import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import { useMemo, useState } from 'react';
import User from '../../models/db/user';
import ProfileInsightsSolveTimeComparison from './profileInsightsSolveTimeComparison';
import { Bar, BarChart, Cell, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
  allPercentiles?: number[];
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
    const difficultyGroups = new Map<string, { faster: number, total: number, allPercentiles: number[] }>();

    // First pass: collect all performance ratios for each difficulty
    comparisons.forEach(c => {
      if (!c.difficulty || !c.otherPlayattemptsAverageDuration || !c.myPlayattemptsSumDuration) return;
      
      const difficulty = getDifficultyFromEstimate(c.difficulty);
      const group = difficultyGroups.get(difficulty.name) || { faster: 0, total: 0, allPercentiles: [] };
      
      group.total++;
      const performanceRatio = c.otherPlayattemptsAverageDuration / c.myPlayattemptsSumDuration;
      
      // Calculate actual percentile for this level
      // Performance ratio > 1 means user was faster than average
      // We need to convert this to a percentile (0-100)
      let levelPercentile: number;
      if (performanceRatio >= 3) {
        // Much faster than average - top 5%
        levelPercentile = 95;
      } else if (performanceRatio >= 2) {
        // Very fast - scale from 80% to 95%
        levelPercentile = 80 + ((performanceRatio - 2) / 1) * 15;
      } else if (performanceRatio >= 1.5) {
        // Fast - scale from 70% to 80%
        levelPercentile = 70 + ((performanceRatio - 1.5) / 0.5) * 10;
      } else if (performanceRatio >= 1) {
        // Faster than average - scale from 50% to 70%
        levelPercentile = 50 + ((performanceRatio - 1) / 0.5) * 20;
      } else if (performanceRatio >= 0.67) {
        // Slower than average - scale from 30% to 50%
        levelPercentile = 30 + ((performanceRatio - 0.67) / 0.33) * 20;
      } else if (performanceRatio >= 0.5) {
        // Much slower - scale from 20% to 30%
        levelPercentile = 20 + ((performanceRatio - 0.5) / 0.17) * 10;
      } else {
        // Very slow - bottom 20%
        levelPercentile = Math.max(5, 20 * performanceRatio / 0.5);
      }
      
      group.allPercentiles.push(Math.round(levelPercentile));
      
      if (performanceRatio > 1) {
        group.faster++;
      }
      
      difficultyGroups.set(difficulty.name, group);
    });

    // Convert to chart data using actual difficulty order - ALWAYS include all difficulties
    const data: PercentileData[] = [];
    const difficultyOrder = difficultyList
      .filter(d => d.name !== 'Pending')
      .sort((a, b) => a.value - b.value) // Sort by difficulty value ascending
      .map(d => d.name);
    
    difficultyOrder.forEach(diffName => {
      const group = difficultyGroups.get(diffName);
      // Only include difficulties with 7+ solves
      if (group && group.total >= 7) {
        // Calculate average percentile across all levels in this difficulty
        const avgPercentile = Math.round(group.allPercentiles.reduce((sum, p) => sum + p, 0) / group.allPercentiles.length);
        const percentileDelta = avgPercentile - 50; // Delta from 50th percentile (average)
        const deltaColor = percentileDelta > 0 ? '#10B981' : percentileDelta < 0 ? '#EF4444' : '#6B7280';

        data.push({
          difficulty: diffName,
          percentile: avgPercentile,
          percentileDelta: percentileDelta,
          totalLevels: group.total,
          fasterCount: group.faster,
          color: deltaColor,
          difficultyIndex: difficultyOrder.findIndex(d => d === diffName), // For X-axis ordering
          allPercentiles: group.allPercentiles, // Store for Super GM bonus calculation
        });
      }
      // Skip difficulties with fewer than 7 solves - don't show them at all
    });

    return data;
  }, [difficultyData]);

  // Calculate Y-axis domain for centering around 0
  const yAxisDomain = useMemo(() => {
    if (!percentileData.length) return [-25, 25];
    
    const allDeltas = percentileData.map(d => d.percentileDelta);
    if (allDeltas.length === 0) return [-25, 25];
    
    const min = Math.min(...allDeltas);
    const max = Math.max(...allDeltas);
    
    // Make sure 0 is centered by using the larger absolute value for both bounds
    const maxAbsValue = Math.max(Math.abs(min), Math.abs(max));
    const padding = Math.max(5, maxAbsValue * 0.2); // At least 5 points padding
    const bound = Math.ceil(maxAbsValue + padding);
    
    return [-bound, bound];
  }, [percentileData]);

  // Calculate weighted competition score based on percentiles
  const { competitionScore, competitionScoreDetails } = useMemo(() => {
    if (!percentileData || percentileData.length === 0 || !difficultyData) {
      return { competitionScore: null, competitionScoreDetails: null };
    }

    // Recreate difficultyGroups for unplayed difficulty checking
    const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as any[];
    const difficultyGroups = new Map<string, { total: number }>();
    
    comparisons.forEach(c => {
      if (!c.difficulty) return;
      const difficulty = getDifficultyFromEstimate(c.difficulty);
      const group = difficultyGroups.get(difficulty.name) || { total: 0 };
      group.total++;
      difficultyGroups.set(difficulty.name, group);
    });

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
    const breakdown: { [key: string]: { percentile: number; weight: number; contribution: number; levels: number } } = {};

    // Find the lowest difficulty the player has played (7+ solves)
    let lowestDifficultyWeight = 11; // Start higher than max
    percentileData.forEach(item => {
      const weight = difficultyWeights[item.difficulty] || 1;
      lowestDifficultyWeight = Math.min(lowestDifficultyWeight, weight);
    });

    // Calculate total possible weight from lowest played difficulty and all higher
    let maxPossibleWeight = 0;
    const includedDifficulties: string[] = [];
    Object.entries(difficultyWeights).forEach(([difficulty, weight]) => {
      if (weight >= lowestDifficultyWeight) {
        maxPossibleWeight += weight;
        includedDifficulties.push(difficulty);
      }
    });

    // Add Super GM bonus to max possible weight if player has Super GM levels
    const superGmData = percentileData.find(item => item.difficulty === 'Super Grandmaster');
    if (superGmData && superGmData.totalLevels > 7) {
      const superGmBonus = superGmData.totalLevels - 7;
      maxPossibleWeight += superGmBonus;
    }
    
    // Add GM bonus to max possible weight if player has GM levels
    const gmData = percentileData.find(item => item.difficulty === 'Grandmaster');
    if (gmData && gmData.totalLevels > 7) {
      const gmBonus = (gmData.totalLevels - 7) * 0.25;
      maxPossibleWeight += gmBonus;
    }

    // Calculate weighted sum for difficulties the user has played (7+ solves)
    percentileData.forEach(item => {
      let weight = difficultyWeights[item.difficulty] || 1;
      let bonusWeight = 0;
      let finalPercentile = item.percentile;
      
      // Special bonus for Super Grandmaster levels
      if (item.difficulty === 'Super Grandmaster' && item.totalLevels > 7) {
        const additionalLevels = item.totalLevels - 7; // Levels beyond the minimum 7
        bonusWeight = additionalLevels; // +1 weight per bonus level
        weight += bonusWeight;
        
        // For each bonus Super GM level, treat it as if they scored 100% on one additional level
        const originalSum = item.percentile * 7; // Original 7 levels contribution
        const bonusSum = additionalLevels * 100; // Each bonus level counts as 100%
        const totalLevels = 7 + additionalLevels;
        
        // New average including bonus levels at 100%
        finalPercentile = Math.round((originalSum + bonusSum) / totalLevels);
      }
      
      // Special bonus for Grandmaster levels (smaller bonus)
      if (item.difficulty === 'Grandmaster' && item.totalLevels > 7) {
        const additionalLevels = item.totalLevels - 7; // Levels beyond the minimum 7
        bonusWeight = additionalLevels * 0.25; // +0.25 weight per bonus level
        weight += bonusWeight;
        
        // For each bonus GM level, treat it as if they scored 100% on one additional level
        const originalSum = item.percentile * 7; // Original 7 levels contribution
        const bonusSum = additionalLevels * 100; // Each bonus level counts as 100%
        const totalLevels = 7 + additionalLevels;
        
        // New average including bonus levels at 100%
        finalPercentile = Math.round((originalSum + bonusSum) / totalLevels);
      }
      
      // Only include in calculation if meets minimum requirement (already filtered to 7+)
      const contribution = finalPercentile * weight;
      weightedPercentileSum += contribution;
      totalWeightUsed += weight;
      
      breakdown[item.difficulty] = {
        percentile: finalPercentile,
        weight: weight,
        contribution: contribution,
        levels: item.totalLevels,
        bonusWeight: bonusWeight > 0 ? bonusWeight : undefined,
        bonusLevels: item.totalLevels > 7 ? item.totalLevels - 7 : undefined,
        originalPercentile: (item.difficulty === 'Super Grandmaster' || item.difficulty === 'Grandmaster') && finalPercentile !== item.percentile ? item.percentile : undefined
      };
    });

    if (totalWeightUsed === 0) return { competitionScore: null, competitionScoreDetails: null };

    // Calculate final score: weighted sum divided by maximum possible weighted sum
    const finalScore = Math.round(weightedPercentileSum / (maxPossibleWeight * 100) * 100);
    
    // Find lowest difficulty name for display
    let lowestDifficultyName = '';
    Object.entries(difficultyWeights).forEach(([difficulty, weight]) => {
      if (weight === lowestDifficultyWeight) {
        lowestDifficultyName = difficulty;
      }
    });

    // Build the full breakdown including unplayed difficulties
    const fullBreakdown: { [key: string]: { percentile: number; weight: number; contribution: number; levels: number; played: boolean; bonusWeight?: number; bonusLevels?: number; originalPercentile?: number } } = {};
    includedDifficulties.forEach(difficulty => {
      const weight = difficultyWeights[difficulty];
      if (breakdown[difficulty]) {
        fullBreakdown[difficulty] = { ...breakdown[difficulty], played: true };
      } else {
        // Check if user has some levels but not enough for minimum
        const group = difficultyGroups.get(difficulty);
        fullBreakdown[difficulty] = {
          percentile: 0,
          weight: weight,
          contribution: 0,
          levels: group ? group.total : 0,
          played: false
        };
      }
    });

    // Calculate details for tooltip
    const details = {
      finalScore: finalScore,
      totalWeightUsed: totalWeightUsed,
      maxPossibleWeight: maxPossibleWeight,
      weightedPercentileSum: Math.round(weightedPercentileSum),
      breakdown: fullBreakdown,
      difficultiesPlayed: Object.keys(breakdown).length,
      lowestDifficulty: lowestDifficultyName,
      includedDifficulties: includedDifficulties
    };

    return { competitionScore: finalScore, competitionScoreDetails: details };
  }, [percentileData, difficultyData]);

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
      {/* Player Strength */}
      {competitionScore !== null && competitionScoreDetails && (
        <div className='bg-gray-800 rounded-lg p-6 text-center'>
          <div className='flex items-center justify-center gap-2 mb-2'>
            <h2 className='text-xl font-bold'>Player Strength</h2>
            <span className='text-xs bg-blue-500 text-white px-2 py-1 rounded-full'>BETA</span>
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
              <div className='font-bold mb-3 text-center'>Player Strength Calculation</div>
              
              <div className='mb-4'>
                <div className='font-semibold mb-2 text-yellow-400'>How it works:</div>
                <div className='text-sm space-y-1'>
                  <div>• Weighted average of your percentiles across difficulty tiers</div>
                  <div>• Kindergarten (weight 1) → Super Grandmaster (weight 10)</div>
                  <div>• Higher difficulties count more toward your final score</div>
                  <div>• Includes {competitionScoreDetails.lowestDifficulty} and all higher difficulties</div>
                  <div>• Super GM Bonus: +1.0 weight per level beyond 7</div>
                  <div>• GM Bonus: +0.25 weight per level beyond 7</div>
                  <div>• Each bonus level counts as 100th percentile performance</div>
                </div>
              </div>

              <div className='mb-4'>
                <div className='font-semibold mb-2 text-blue-400'>Your breakdown:</div>
                <div className='bg-gray-800 rounded p-3 space-y-1'>
                  {Object.entries(competitionScoreDetails.breakdown)
                    .sort((a, b) => (a[1].weight - (a[1].bonusWeight || 0)) - (b[1].weight - (b[1].bonusWeight || 0)))
                    .map(([difficulty, data]) => (
                      <div key={difficulty} className='flex justify-between text-sm'>
                        <span className={data.played ? '' : 'text-gray-500'}>
                          {difficulty} {data.played ? `(${data.levels} levels)` : data.levels > 0 ? `(${data.levels} levels - min 7 required)` : '(not played)'}
                          {data.bonusLevels && (difficulty === 'Super Grandmaster' || difficulty === 'Grandmaster') && (
                            <span className='text-green-400 ml-1'>
                              +{data.bonusLevels} bonus (+{data.bonusWeight?.toFixed(2)} weight)
                            </span>
                          )}
                          {data.originalPercentile && (
                            <span className='text-blue-400 ml-1'>
                              ({data.originalPercentile}% → {data.percentile}%)
                            </span>
                          )}:
                        </span>
                        <span className={`font-mono ${data.played ? '' : 'text-gray-500'} text-right`}>
                          {data.percentile.toString().padStart(3)}% × {data.weight.toString().padStart(2)} = {data.contribution.toString().padStart(5)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className='border-t border-gray-600 pt-3'>
                <div className='font-semibold mb-2 text-green-400'>Final calculation:</div>
                <div className='bg-gray-800 rounded p-3 font-mono text-sm'>
                  <div className='mb-2'>
                    <div className='text-xs text-gray-400 mb-1'>Weighted sum calculation:</div>
                    <div className='text-xs'>
                      {Object.entries(competitionScoreDetails.breakdown)
                        .filter(([_, data]) => data.played)
                        .map(([diff, data], index, array) => (
                          <span key={diff}>
                            {data.contribution}
                            {index < array.length - 1 ? ' + ' : ''}
                          </span>
                        ))}
                      {' = '}{competitionScoreDetails.weightedPercentileSum}
                    </div>
                  </div>
                  <div>Total weighted sum: {competitionScoreDetails.weightedPercentileSum}</div>
                  <div className='mt-2'>
                    <div className='text-xs text-gray-400 mb-1'>Max possible weighted sum ({competitionScoreDetails.lowestDifficulty}+):</div>
                    <div className='text-xs'>
                      {Object.entries(competitionScoreDetails.breakdown)
                        .sort((a, b) => a[1].weight - b[1].weight)
                        .map(([diff, data], index, array) => (
                          <span key={diff}>
                            ({data.weight}×100)
                            {index < array.length - 1 ? ' + ' : ''}
                          </span>
                        ))}
                      {' = '}{competitionScoreDetails.maxPossibleWeight * 100}
                    </div>
                  </div>
                  <div className='border-t border-gray-600 mt-2 pt-2 font-bold'>
                    Final score: {competitionScoreDetails.weightedPercentileSum} ÷ {competitionScoreDetails.maxPossibleWeight * 100} = {competitionScoreDetails.finalScore}
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
            How many percentage points above (+) or below (-) average you perform in each difficulty tier
            <span className='block text-xs text-gray-500 mt-1'>
              Only shows difficulty tiers with 7+ levels solved. 0 = average (50th percentile)
            </span>
          </p>
          <div className='bg-gray-800 rounded-lg p-3 mb-4'>
            <div className='text-xs text-gray-300 text-center'>
              <div className='mb-1'><strong>How to read:</strong> +25 means 75th percentile (25% above average)</div>
              <div className='text-gray-400'>This shows your <em>competitive ranking delta</em>, not speed difference (see Time Analytics for that)</div>
            </div>
          </div>
          <div className='w-full h-80'>
            <ResponsiveContainer width='100%' height='100%'>
              <ComposedChart data={percentileData} margin={{ top: 60, right: 30, left: 0, bottom: 20 }}>
                <XAxis 
                  dataKey='difficultyIndex'
                  type="number"
                  domain={[-0.5, percentileData.length - 0.5]}
                  orientation='top'
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  ticks={Array.from({ length: percentileData.length }, (_, i) => i)}
                  tickFormatter={(value) => {
                    return percentileData[value]?.difficulty || '';
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  type="number"
                  domain={yAxisDomain}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}`}
                  allowDataOverflow={false}
                  label={{ value: 'Percentile Delta', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <ReferenceLine 
                  y={0} 
                  stroke='#6B7280' 
                  strokeDasharray='2 2'
                  label={{ value: 'Average (50th percentile)', position: 'topRight', style: { fill: '#9CA3AF', fontSize: '12px' } }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgb(31, 41, 55)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: 'rgb(229, 231, 235)',
                  }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      
                      return (
                        <div className='bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-600'>
                          <div className='text-sm text-gray-100'>
                            <div className='font-bold text-blue-400 mb-2'>{data.difficulty} Difficulty</div>
                            <div>Levels solved: <span className='font-bold'>{data.totalLevels}</span></div>
                            <div className='border-t border-gray-600 mt-2 pt-2'>
                              <div className='text-lg font-bold mb-1'>
                                <span style={{ color: data.color }}>
                                  {data.percentile}th percentile
                                </span>
                              </div>
                              <div className='text-xs text-gray-400'>
                                {data.percentileDelta > 0 ? 
                                  `${data.percentileDelta}% above average` :
                                  data.percentileDelta < 0 ?
                                  `${Math.abs(data.percentileDelta)}% below average` :
                                  'Exactly average'
                                }
                              </div>
                              <div className='mt-2 text-xs text-gray-500'>
                                <div>Times you beat average: {data.fasterCount} of {data.totalLevels}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey='percentileDelta' 
                  name="Percentile Delta"
                  fillOpacity={0.5}
                >
                  {percentileData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      style={{
                        transition: 'opacity 0.2s ease-in-out',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.fillOpacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.fillOpacity = '0.5';
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
                <div className='w-3 h-3 bg-green-500 rounded'></div>
                <span className='text-gray-300'>Above average (above baseline)</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-3 h-3 bg-red-500 rounded'></div>
                <span className='text-gray-300'>Below average (below baseline)</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-4 h-1 bg-gray-500 rounded border-t border-dashed border-gray-500'></div>
                <span className='text-gray-300'>Average baseline (50th percentile)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Solve Time Comparison Scatter Plot */}
      {showPrivateData && <ProfileInsightsSolveTimeComparison user={user} timeFilter={timeFilter} />}

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
              {percentileData.filter(d => d.percentile < 50).map(d => (
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
              {percentileData.filter(d => d.percentile < 50).length === 0 && (
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