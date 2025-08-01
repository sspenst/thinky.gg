import { GameType } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import { useContext, useState } from 'react';
import { Brush, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Symbols, Tooltip, XAxis, YAxis } from 'recharts';
import User from '../../models/db/user';
import { difficultyList, getDifficultyColor, getDifficultyFromEstimate } from '../formatted/formattedDifficulty';
import StyledTooltip from '../page/styledTooltip';
import { TimeFilter } from './profileInsights';

export interface DifficultyLevelComparison {
  _id: string;
  calc_playattempts_just_beaten_count: number;
  diff?: number;
  difficulty: number;
  difficultyAdjusted: number;
  myPlayattemptsSumDuration: number;
  name: string;
  otherPlayattemptsAverageDuration: number;
  slug: string;
  ts: number;
}

function dotColor(percent: number) {
  const hue = 120 * (percent + 1) / 2; // Hue value will be between 0 (red) and 120 (green)
  const saturation = 100 * Math.abs(percent); // Saturation will be between 50% (dark) and 100% (bright)
  const lightness = 50; // Set lightness to 50% to get neither too dark nor too light colors

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

interface ProfileInsightsSolveTimeComparisonProps {
  user: User;
  timeFilter?: TimeFilter;
}

export default function ProfileInsightsSolveTimeComparison({ user, timeFilter }: ProfileInsightsSolveTimeComparisonProps) {
  const { proStatsUser: difficultyComparisonData } = useProStatsUser(user, ProStatsUserType.DifficultyLevelsComparisons, timeFilter);
  const router = useRouter();
  const [hideAnomalies, setHideAnomalies] = useState(false);
  const [percentile, setPercentile] = useState(0.01);
  const { game } = useContext(AppContext);

  if (!difficultyComparisonData || !difficultyComparisonData[ProStatsUserType.DifficultyLevelsComparisons]) {
    return <span>Loading...</span>;
  }

  // draw a scatter plot with a difficulty bucket on the x axis and the two dots on the y axis for the difficulty and average duration
  let data = difficultyComparisonData[ProStatsUserType.DifficultyLevelsComparisons] as DifficultyLevelComparison[];

  data = data.filter(d => d.otherPlayattemptsAverageDuration && d.myPlayattemptsSumDuration);

  for (const d of data) {
    d.diff = d.otherPlayattemptsAverageDuration / d.myPlayattemptsSumDuration;
  }

  if (hideAnomalies) {
    const sorted = data.sort((a, b) => (a.diff ?? 1) - (b.diff ?? 1));
    const top1Percent = Math.floor(sorted.length * percentile);
    const bottom1Percent = Math.floor(sorted.length * (1 - percentile));

    data = sorted.slice(top1Percent, bottom1Percent);
  }

  const maxDifficultySolved = Math.max(...data.map(d => d.difficulty).filter(x => x));
  // 0.9 and 1.1 because we always want to show the line at 1 on the graph
  const maxYValue = Math.max(...data.map(d => d.diff || 0).filter(x => x), 1.1);
  const minYValue = Math.min(...data.map(d => d.diff || 0).filter(x => x), 0.9);
  // remove the difficulties that are not solved
  const difficultiesToDisplay = difficultyList.findLastIndex(d => d.value <= maxDifficultySolved);
  let max: number;

  if (difficultiesToDisplay === difficultyList.length - 1) {
    max = maxDifficultySolved;
  } else {
    max = difficultyList[difficultiesToDisplay + 1]?.value || difficultyList[difficultyList.length - 1].value;
  }

  const difficutlyType = game.type === GameType.SHORTEST_PATH ? 'Solve' : 'Completion';

  return (<>
    <div className='flex flex-col gap-2 max-w-full'>
      <h2 className='text-xl font-bold'>{difficutlyType} Time Comparisons</h2>
      <p className='text-sm break-words'>
        This chart shows solve time vs average {difficutlyType.toLowerCase()} time for the levels {user.name} has solved
        {timeFilter && timeFilter !== 'all' ? (
          timeFilter === '30d' ? ' in the last 30 days' :
            timeFilter === '7d' ? ' in the last 7 days' :
              timeFilter === '1y' ? ' in the last year' : ''
        ) : ''}.
        <br />
        Green indicates it took {user.name} less time to solve the level than the average user.
      </p>
    </div>
    <div className='w-full' key={'difficultycomparsion-chart'}>
      {/* input checkbox to hide anomolies */ }
      <div className='flex gap-4 justify-center'>
        <div className='flex gap-2'>
          <input id='solve-remove-anomalies' type='checkbox' checked={(hideAnomalies)} onChange={(e) => setHideAnomalies(e.target.checked)} />
          <label htmlFor='solve-remove-anomalies'>Filter <span className='underline decoration-dashed cursor-help' data-tooltip-content='Remove top percentile and bottom percentile from graph' data-tooltip-id='solve-remove-anomalies'>anomalies</span></label>
        </div>
        <div className='flex gap-2'>
          <label htmlFor='score-percentile'>Percentile</label>
          {/* dropdown for 0.1% , 1%, 5%, 10% */}
          <select id='score-percentile' value={percentile} onChange={(e) => setPercentile(parseFloat(e.target.value))} className='border border-gray-300 rounded-md'>
            <option value={0.001}>0.1%</option>
            <option value={0.01}>1%</option>
            <option value={0.05}>5%</option>
            <option value={0.1}>10%</option>
          </select>
        </div>
      </div>
      <StyledTooltip id='score-remove-anomalies' />
      <ResponsiveContainer width='100%' height={400} >
        <ScatterChart margin={
          {
            top: 10, right: 30, bottom: 10, left: 50,
          }
        }>
          <XAxis
            dataKey='difficulty'
            domain={[0, max]}
            label={{ value: 'Difficulty', position: 'insideBottom', offset: 10 }}
            name='Difficulty'
            scale={'sqrt'}
            tick={false}
            type='number'
          />
          <YAxis
            dataKey='diff'
            domain={[minYValue, maxYValue]}
            hide={false}
            label={{ value: '<- Slower ... Faster ->', offset: 0, angle: -90, }}
            scale={'log'}
            tick={false}
            type='number'
            width={20}
          />
          {/* add ability to zoom */}
          <Brush dataKey='difficulty' height={30} stroke='#8884d8' />
          <ReferenceLine y={1} stroke='white' />
          {
            difficultyList.map((d, i) => {
              if (d.name === 'Pending') {
                return null;
              }

              const x1 = d.value;

              // user has not solved any levels in this category
              if (max <= x1) {
                return null;
              }

              let x2 = difficultyList[i + 1]?.value;

              if (!x2) {
                x2 = max;
              }

              return (
                <ReferenceArea
                  fill={getDifficultyColor(d.value)}
                  key={'refline-' + i}
                  label={{ value: d.name, position: 'insideRight', offset: 10, angle: 90 }}
                  opacity={0.25}
                  stroke='white'
                  x1={x1}
                  x2={x2}
                />
              );
            })
          }
          <Tooltip
            content={
              ({ active, payload }) => {
                if (active && payload && payload[0] && payload[0].payload) {
                  const difficultyLevelComparison = (payload[0].payload as DifficultyLevelComparison);
                  const name = difficultyLevelComparison.name;
                  const difficulty = difficultyLevelComparison.difficulty;
                  const ts = difficultyLevelComparison.ts * 1000;
                  const diff = difficultyLevelComparison.diff as number;
                  const timeTakenForOthersToSolve = dayjs.duration(difficultyLevelComparison.otherPlayattemptsAverageDuration * 1000).humanize();
                  const timeTakenToSolve = dayjs.duration(difficultyLevelComparison.myPlayattemptsSumDuration * 1000).humanize();
                  const multiplier = diff >= 1 ? diff.toFixed(1) : (1 / diff).toFixed(1);

                  return (
                    <div className='p-2 bg-gray-800 text-sm'>
                      <span className='font-bold'>{`${name} (${getDifficultyFromEstimate(difficulty).name})`}</span>
                      <div className='flex flex-col'>
                        <span>{user.name}: <span className='font-bold'>{timeTakenToSolve}</span></span>
                        <span>Others: <span className='font-bold'>{timeTakenForOthersToSolve}</span> - {difficultyLevelComparison.calc_playattempts_just_beaten_count} solvers</span>
                      </div>
                      <span className='text-xs'>
                        {`${multiplier}x ${(diff >= 1 ? 'faster' : 'slower')} than average`}
                        <br />
                        {user.name} solved <span className='font-bold text-xs'>{dayjs(ts).fromNow()}</span>
                      </span>
                    </div>
                  );
                }
              }
            }
            wrapperStyle={{ outline: 'none' }}
          />
          <Scatter
            cursor='pointer'
            data={data}
            key='scatterchart'
            name={user.name}
            onClick={(e) => {
              router.push('/level/' + e.slug);
            }}
            // conditional color red if diff is negative, green if positive
            shape={({ ...rest }) => {
              const difficultyLevelComparison = rest.payload as DifficultyLevelComparison | undefined;
              const percent = Math.min(Math.max(Math.log(difficultyLevelComparison?.diff ?? 1) / 2, -1), 1);
              const fill = dotColor(percent);

              return (
                <Symbols
                  type='circle'
                  fill={fill}
                  {...rest}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  </>);
}
