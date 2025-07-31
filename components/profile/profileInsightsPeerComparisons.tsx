import Role from '@root/constants/role';
import { hasProAccessForProfile } from '@root/helpers/isDemoProAccess';
import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { Bar, Cell, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import User from '../../models/db/user';
import { difficultyList, getDifficultyColor, getDifficultyFromEstimate } from '../formatted/formattedDifficulty';
import FormattedLevelLink from '../formatted/formattedLevelLink';
import { TimeFilter } from './profileInsights';
import ProfileInsightsSolveTimeComparison from './profileInsightsSolveTimeComparison';

interface ProfileInsightsPeerComparisonsProps {
  user: User;
  reqUser: User | null;
  timeFilter: TimeFilter;
}

interface PercentileData {
  difficulty: string;
  percentile: number;
  percentileDelta: number;
  totalLevels: number;
  fasterCount: number;
  color: string;
  difficultyIndex: number;
  allPercentiles?: number[];
}

export default function ProfileInsightsPeerComparisons({ user, reqUser, timeFilter }: ProfileInsightsPeerComparisonsProps) {
  const canViewPeerComparisons = (reqUser?._id === user._id) || (reqUser?.roles?.includes(Role.ADMIN) || hasProAccessForProfile(reqUser, user));
  const { proStatsUser: difficultyData, isLoading } = useProStatsUser(user, ProStatsUserType.DifficultyLevelsComparisons, timeFilter, !canViewPeerComparisons);
  const [showTooltip, setShowTooltip] = useState(false);

  // Analyze retry patterns using real difficulty comparison data
  const challengingConquests = useMemo(() => {
    if (!difficultyData || !difficultyData[ProStatsUserType.DifficultyLevelsComparisons]) {
      return [];
    }

    const comparisons = difficultyData[ProStatsUserType.DifficultyLevelsComparisons] as any[];

    // Filter levels that took longer than average and preserve original level data
    return comparisons
      .filter(c => c.myPlayattemptsSumDuration && c.otherPlayattemptsAverageDuration &&
                  c.myPlayattemptsSumDuration > c.otherPlayattemptsAverageDuration * 1.5)
      .slice(0, 5)
      .map(c => ({
        // Preserve the original level object for FormattedLevelLink
        _id: c._id,
        name: c.name,
        slug: c.slug,
        // Add computed fields for display
        attempts: Math.ceil(c.myPlayattemptsSumDuration / c.otherPlayattemptsAverageDuration * 2),
        finalTime: c.myPlayattemptsSumDuration,
        improvement: Math.round((1 - c.otherPlayattemptsAverageDuration / c.myPlayattemptsAverageDuration) * 100),
        difficulty: getDifficultyFromEstimate(c.difficulty).name,
        difficultyRating: c.difficulty, // Store raw difficulty for rating display
        otherPlayattemptsAverageDuration: c.otherPlayattemptsAverageDuration,
        // Include other properties that FormattedLevelLink might need
        ...c
      }));
  }, [difficultyData]);

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

      // Skip levels that don't have enough data for meaningful comparison
      if (!c.calc_playattempts_just_beaten_count || c.calc_playattempts_just_beaten_count < 2) {
        return; // Need at least 2 completions to make a meaningful comparison
      }

      const difficulty = getDifficultyFromEstimate(c.difficulty);
      const group = difficultyGroups.get(difficulty.name) || { faster: 0, total: 0, allPercentiles: [] };

      group.total++;
      const performanceRatio = c.otherPlayattemptsAverageDuration / c.myPlayattemptsSumDuration;

      // Calculate strength score based on performance ratio
      // Performance ratio > 1 means user was faster than average
      let levelStrengthScore: number;

      // Handle edge case: if user is only solver (calc_playattempts_just_beaten_count = 1)
      // This shouldn't happen due to the filter above, but keep as safety
      if (c.calc_playattempts_just_beaten_count <= 5) {
        // If user is one of the only solvers, they get maximum strength score for that difficulty
        levelStrengthScore = 100;
      } else {
        // Use a single logarithmic formula to convert performance ratio to strength score
        // This maps performance ratios to a 1-99 scale where 50 = average performance
        // performanceRatio > 1 = faster than average, < 1 = slower than average

        // Clamp extreme values to prevent unrealistic scores
        const clampedRatio = Math.max(0.1, Math.min(10, performanceRatio));

        // Use logarithmic scaling: 50 + 25 * log2(ratio)
        // This gives: 2x faster = 75, 4x faster = 100, 0.5x = 25, 0.25x = 0
        levelStrengthScore = 50 + 25 * Math.log2(clampedRatio);

        // Ensure score stays within reasonable bounds (1-99)
        levelStrengthScore = Math.max(1, Math.min(99, Math.round(levelStrengthScore)));
      }

      group.allPercentiles.push(Math.round(Math.max(1, Math.min(99, levelStrengthScore))));

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
    const breakdown: { [key: string]: { percentile: number; weight: number; contribution: number; levels: number; bonusWeight?: number; bonusLevels?: number; originalPercentile?: number } } = {};

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

      maxPossibleWeight += superGmBonus * 1;
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

        bonusWeight = additionalLevels * 1; // +1 weight per bonus level
        weight += bonusWeight;

        // Moderate boost for bonus levels - treat them as adding 80% performance

        const totalLevels = 7 + additionalLevels;
        const newValue = (bonusWeight * 100 + item.percentile * totalLevels) / (totalLevels + bonusWeight);

        finalPercentile = Math.round(newValue);
      }

      // Special bonus for Grandmaster levels (smaller bonus)
      if (item.difficulty === 'Grandmaster' && item.totalLevels > 7) {
        const additionalLevels = item.totalLevels - 7; // Levels beyond the minimum 7

        bonusWeight = additionalLevels * 0.25; // +0.25 weight per bonus level
        weight += bonusWeight;

        // Moderate boost for bonus levels - treat them as adding 80% performance
        const totalLevels = 7 + additionalLevels;

        const newValue = (bonusWeight * 100 + item.percentile * totalLevels) / (totalLevels + bonusWeight);

        finalPercentile = Math.round(newValue);
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
        originalPercentile: (item.difficulty === 'Super Grandmaster' && finalPercentile !== item.percentile) || (item.difficulty === 'Grandmaster' && item.totalLevels > 7) ? item.percentile : undefined
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
        <div className='h-4 bg-gray-700 rounded w-3/4' />
        <div className='h-4 bg-gray-700 rounded w-1/2' />
        <div className='h-4 bg-gray-700 rounded w-2/3' />
      </div>
    </div>
  );

  // Access control - only show for own profile or admin

  if (!canViewPeerComparisons) {
    return (
      <div className='text-center text-lg text-gray-400'>
        <p>Peer comparison data is only available for your own profile.</p>
      </div>
    );
  }

  // Only show loading if we can view data and hooks are actually loading
  const shouldShowLoading = canViewPeerComparisons && isLoading;

  if (shouldShowLoading) {
    return (
      <div className='flex flex-col gap-6 w-full'>
        {/* Competition Score Loading */}
        <div className='bg-gray-800 rounded-lg p-6 animate-pulse'>
          <div className='text-center'>
            <div className='h-6 bg-gray-700 rounded mb-2 w-40 mx-auto' />
            <div className='h-16 w-16 bg-gray-700 rounded-full mx-auto mb-2' />
            <div className='h-4 bg-gray-700 rounded w-64 mx-auto' />
          </div>
        </div>
        <LoadingSkeleton height='h-80' />
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6 w-full'>
      {/* Player Speed Score */}
      {competitionScore !== null && competitionScoreDetails && (
        <div className='bg-gray-800 rounded-lg p-6 text-center'>
          <div className='flex items-center justify-center gap-2 mb-2'>
            <h2 className='text-xl font-bold'>Player Speed Score</h2>
            <span className='text-xs bg-blue-500 text-white px-2 py-1 rounded-full'>BETA</span>
          </div>
          <div className='text-5xl font-bold mb-2' style={{ color: competitionScore >= 75 ? '#10B981' : competitionScore >= 50 ? '#3B82F6' : competitionScore >= 25 ? '#F59E0B' : '#EF4444' }}>
            {competitionScore}
          </div>
          <p className='text-sm text-gray-400 mb-3'>
            Weighted average of {user.name}&apos;s performance scores across all difficulty tiers
          </p>
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            className='text-blue-400 hover:text-blue-300 text-sm underline focus:outline-none'
          >
            {showTooltip ? 'Hide Calculation' : 'Show Calculation'}
          </button>
          {showTooltip && (
            <div className='mt-4 bg-gray-700 rounded-lg p-4 text-left'>
              <div className='font-bold mb-3 text-center'>Player Speed Score Calculation</div>
              <div className='mb-4'>
                <div className='font-semibold mb-2 text-yellow-400'>How it works:</div>
                <div className='text-sm space-y-1'>
                  <div>• Weighted average of {user.name}&apos;s performance scores across difficulty tiers</div>
                  <div>• Kindergarten (weight 1) → Super Grandmaster (weight 10)</div>
                  <div>• Higher difficulties count more toward {user.name}&apos;s final score</div>
                  <div>• Includes {competitionScoreDetails.lowestDifficulty} and all higher difficulties</div>
                  <div>• Super GM Bonus: +1 weight per level beyond 7</div>
                  <div>• GM Bonus: +0.25 weight per level beyond 7</div>
                  <div>• Each bonus level counts as 100% performance score in the average</div>
                </div>
              </div>
              <div className='mb-4'>
                <div className='font-semibold mb-2 text-blue-400'>{user.name}&apos;s breakdown:</div>
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
          <div className='mt-2 text-xs text-gray-600 text-center'>
            Note: Only includes levels at least 7 days old with 2+ completions for fair comparison
          </div>
        </div>
      )}
      {/* Percentile Rankings by Difficulty */}
      {percentileData.length > 0 && (
        <div className='flex flex-col gap-2'>
          <h2 className='text-xl font-bold text-center'>Player Ranking by Difficulty</h2>
          <p className='text-sm text-gray-400 text-center mb-4'>
            How many percentage points above (+) or below (-) average {user.name} performs in each difficulty tier
            <span className='block text-xs text-gray-500 mt-1'>
              Only shows difficulty tiers with 7+ levels solved. 0 = average performance (50 score)
              <br />Excludes levels newer than 7 days and levels with fewer than 2 total completions
            </span>
          </p>
          <div className='bg-gray-800 rounded-lg p-3 mb-4'>
            <div className='text-xs text-gray-300 text-center'>
              <div className='mb-1'><strong>How to read:</strong> +25 means 75 score (25 points above average)</div>
              <div className='text-gray-400'>This shows {user.name}&apos;s <em>competitive ranking delta</em>, not speed difference (see Time Analytics for that)</div>
            </div>
          </div>
          <div className='w-full h-80'>
            <ResponsiveContainer width='100%' height='100%'>
              <ComposedChart data={percentileData} margin={{ top: 60, right: 30, left: 0, bottom: 20 }}>
                <XAxis
                  dataKey='difficultyIndex'
                  type='number'
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
                  type='number'
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
                  label={{ value: 'Average (50 score)', position: 'insideTopRight' as const, style: { fill: '#9CA3AF', fontSize: '12px' } }}
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

                      return (
                        <div className='bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-600'>
                          <div className='text-sm text-gray-100'>
                            <div className='font-bold text-blue-400 mb-2'>{data.difficulty} Difficulty</div>
                            <div>Levels solved: <span className='font-bold'>{data.totalLevels}</span></div>
                            <div className='border-t border-gray-600 mt-2 pt-2'>
                              <div className='text-lg font-bold mb-1'>
                                <span style={{ color: data.color }}>
                                  {data.percentile} performance score
                                </span>
                              </div>
                              <div className='text-xs text-gray-400'>
                                {data.percentileDelta > 0 ?
                                  `${data.percentileDelta} points above average` :
                                  data.percentileDelta < 0 ?
                                    `${Math.abs(data.percentileDelta)} points below average` :
                                    'Exactly average'
                                }
                              </div>
                              <div className='mt-2 text-xs text-gray-500'>
                                <div>Times {user.name} beat average: {data.fasterCount} of {data.totalLevels}</div>
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
                  name='Percentile Delta'
                  fillOpacity={0.5}
                >
                  {percentileData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
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
                <span className='text-gray-300'>Above average (above baseline)</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-3 h-3 bg-red-500 rounded' />
                <span className='text-gray-300'>Below average (below baseline)</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-4 h-1 bg-gray-500 rounded border-t border-dashed border-gray-500' />
                <span className='text-gray-300'>Average baseline (50 score)</span>
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
          Where {user.name} ranks among other players (60+ score = above average)
          <span className='block text-xs text-gray-500 mt-1'>
            Only includes difficulty tiers with 7+ levels solved (levels must be 7+ days old)
          </span>
        </p>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <div className='flex items-center gap-2 mb-3'>
              <div className='w-3 h-3 bg-green-500 rounded-full' />
              <h4 className='font-semibold text-green-400'>{user.name}&apos;s Strongest Difficulty Tiers</h4>
            </div>
            <div className='space-y-2'>
              {percentileData.filter(d => d.percentile >= 60).map(d => (
                <div key={d.difficulty} className='bg-green-500/10 border border-green-500/20 rounded-lg p-3'>
                  <div className='flex justify-between items-center'>
                    <span className='font-medium'>{d.difficulty}</span>
                    <span className='text-green-400 font-bold'>{d.percentile} performance score</span>
                  </div>
                  <p className='text-xs text-gray-400 mt-1'>
                    {user.name} scored {d.percentile}/100 vs other players in this difficulty
                  </p>
                </div>
              ))}
              {percentileData.filter(d => d.percentile >= 60).length === 0 && (
                <div className='text-center p-4 text-gray-500 italic'>
                  🎯 Keep practicing to improve {user.name}&apos;s competitive standing!<br />
                  <span className='text-xs text-gray-600 mt-1'>Solve 7+ levels in difficulty tiers to see rankings</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <div className='flex items-center gap-2 mb-3'>
              <div className='w-3 h-3 bg-yellow-500 rounded-full' />
              <h4 className='font-semibold text-yellow-400'>Areas Below Average</h4>
            </div>
            <div className='space-y-2'>
              {percentileData.filter(d => d.percentile < 50).map(d => (
                <div key={d.difficulty} className='bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3'>
                  <div className='flex justify-between items-center'>
                    <span className='font-medium'>{d.difficulty}</span>
                    <span className='text-yellow-400 font-bold'>{d.percentile} performance score</span>
                  </div>
                  <p className='text-xs text-gray-400 mt-1'>
                    {user.name} scored {d.percentile}/100 vs other players in this difficulty
                  </p>
                </div>
              ))}
              {percentileData.filter(d => d.percentile < 50).length === 0 && (
                <div className='text-center p-4 text-green-400 italic'>
                  🌟 Great! {user.name} is above average in all difficulty tiers.
                  <span className='block text-xs text-gray-500 mt-1'>
                    (Based on tiers with 7+ levels solved)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Your Most Challenging Conquests */}
      {challengingConquests.length > 0 && (
        <div className='flex flex-col gap-2'>
          <h2 className='text-xl font-bold text-center'>Your Most Challenging Conquests</h2>
          <p className='text-sm text-gray-400 text-center mb-4'>
            These levels took you longer than the average player, showing your perseverance in tackling difficult puzzles.
            The time shown is your total solving time compared to the community average.
            {timeFilter && timeFilter !== 'all' && (
              <span className='block text-xs text-gray-500 mt-1'>
                From the {timeFilter === '7d' ? 'last 7 days' : timeFilter === '30d' ? 'last 30 days' : timeFilter === '1y' ? 'last year' : 'selected period'}
              </span>
            )}
          </p>
          <div className='bg-gray-800 rounded-lg overflow-hidden'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-700'>
                <tr>
                  <th className='text-left p-3'>Level</th>
                  <th className='text-center p-3'>Difficulty</th>
                  <th className='text-center p-3'>Your Time</th>
                  <th className='text-center p-3'>Average Time</th>
                  <th className='text-center p-3'>Comparison</th>
                </tr>
              </thead>
              <tbody>
                {challengingConquests.map((level, index) => (
                  <tr key={index} className='border-t border-gray-700'>
                    <td className='p-3'>
                      <FormattedLevelLink
                        id={`challenging-level-${index}`}
                        level={level}
                      />
                    </td>
                    <td className='text-center p-3'>
                      <span className='px-2 py-1 rounded text-xs' style={{
                        backgroundColor: getDifficultyColor(difficultyList.find(d => d.name === level.difficulty)?.value || 0) + '20',
                        color: getDifficultyColor(difficultyList.find(d => d.name === level.difficulty)?.value || 0),
                      }}>
                        {level.difficultyRating ? getDifficultyFromEstimate(level.difficultyRating).name : level.difficulty}
                      </span>
                    </td>
                    <td className='text-center p-3'>{dayjs.duration(level.finalTime * 1000).format('mm:ss')}</td>
                    <td className='text-center p-3'>{dayjs.duration(level.otherPlayattemptsAverageDuration * 1000).format('mm:ss')}</td>
                    <td className='text-center p-3'>
                      <div className='group relative'>
                        <span className='text-yellow-400 cursor-help underline decoration-dashed'>
                          {(level.finalTime / level.otherPlayattemptsAverageDuration).toFixed(1)}x longer
                        </span>
                        <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap'>
                          <div className='text-xs text-gray-300'>
                            <div>Your time: {level.finalTime}s</div>
                            <div>Average: {level.otherPlayattemptsAverageDuration.toFixed(1)}s</div>
                            <div className='mt-1 text-yellow-400'>
                              {level.finalTime}s ÷ {level.otherPlayattemptsAverageDuration.toFixed(1)}s = {(level.finalTime / level.otherPlayattemptsAverageDuration).toFixed(2)}x
                            </div>
                          </div>
                          <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-700' />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
