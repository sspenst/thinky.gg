import Role from '@root/constants/role';
import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import duration from 'dayjs/plugin/duration';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import User from '../../models/db/user';
import { difficultyList, getDifficultyColor, getDifficultyFromEstimate } from '../formatted/formattedDifficulty';
import FormattedLevelLink from '../formatted/formattedLevelLink';
import { TimeFilter } from './profileInsights';
import ProfileInsightsRecords from './profileInsightsRecords';

dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

interface ProfileInsightsLevelMasteryProps {
  user: User;
  reqUser: User | null;
  timeFilter: TimeFilter;
}

interface DifficultyProgressData {
  name: string;
  value: number;
  color: string;
  levelCount: number;
  firstSolved?: string;
  latestSolved?: string;
}

interface RetryAnalysisData {
  levelName: string;
  attempts: number;
  finalTime: number;
  improvement: number;
  difficulty: string;
}

export default function ProfileInsightsLevelMastery({ user, reqUser, timeFilter }: ProfileInsightsLevelMasteryProps) {
  const { proStatsUser: difficultyData, isLoading: isLoadingDifficulty } = useProStatsUser(user, ProStatsUserType.DifficultyLevelsComparisons, timeFilter);
  const { proStatsUser: recordsData, isLoading: isLoadingRecords } = useProStatsUser(user, ProStatsUserType.Records, timeFilter);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [timelineMode, setTimelineMode] = useState<'max' | 'average'>('average');

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


  const isOwnProfile = reqUser?._id === user._id;
  const isAdmin = reqUser?.roles?.includes(Role.ADMIN);

  // Loading component
  const LoadingSpinner = () => (
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

  if (isLoadingDifficulty) {
    return (
      <div className='flex flex-col gap-6 w-full'>
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6 w-full'>
      {/* Difficulty Conquest Map */}
      <div className='flex flex-col gap-2'>
        <h2 className='text-xl font-bold text-center'>Difficulty Conquest Map</h2>
        <p className='text-sm text-gray-400 text-center mb-4'>
          Your progression through different difficulty tiers
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
    </div>
  );
}
