import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import moment from 'moment';
import { useRouter } from 'next/router';
import React from 'react';
import { Brush, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Symbols, Tooltip, XAxis, YAxis } from 'recharts';
import User from '../../models/db/user';
import { getDifficultyColor, getDifficultyFromValue, getDifficultyList } from '../difficultyDisplay';

export interface DifficultyLevelComparison {
  /*
  "ts": 1681218728,
"_id": "641a27f6d8a962fe6c705862",
"name": "Bad Maze",
"difficulty": 5.598526621827416,
"slug": "unimportant05/bad-maze",
"calc_playattempts_just_beaten_count": 32,
"other_calc_playattempts_just_beaten_count": 31,
"myPlayattemptsAverageDuration": 4,
"otherPlayattemptsAverageDuration": 5.419354838709677
*/
  ts: number;
  _id: string;
  name: string;
  difficulty: number;
  diff?: number;
  difficultyAdjusted: number;
  slug: string;
  calc_playattempts_just_beaten_count: number;
  myPlayattemptsAverageDuration: number;
  otherPlayattemptsAverageDuration: number;
}

function dotColor(percent: number) {
  const hue = 120 * (percent + 1) / 2; // Hue value will be between 0 (red) and 120 (green)
  const saturation = 100 * Math.abs(percent); // Saturation will be between 50% (dark) and 100% (bright)
  const lightness = 50; // Set lightness to 50% to get neither too dark nor too light colors

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export default function ProfileInsightsSolveTimeComparison({ user }: { user: User }) {
  const { proStatsUser: difficultyComparisonData } = useProStatsUser(user, ProStatsUserType.DifficultyLevelsComparisons);
  const router = useRouter();

  if (!difficultyComparisonData || !difficultyComparisonData[ProStatsUserType.DifficultyLevelsComparisons]) {
    return <span>Loading...</span>;
  }

  // draw a scatter plot with a difficulty bucket on the x axis and the two dots on the y axis for the difficulty and average duration
  let data = difficultyComparisonData[ProStatsUserType.DifficultyLevelsComparisons];
  let diffPercentage;

  for (const d of data) {
    const sign = d.otherPlayattemptsAverageDuration > d.myPlayattemptsAverageDuration ? 1 : -1;

    if (sign > 0) {
      diffPercentage = (d.otherPlayattemptsAverageDuration / d.myPlayattemptsAverageDuration);
    } else {
      diffPercentage = sign * (d.myPlayattemptsAverageDuration / d.otherPlayattemptsAverageDuration);
    }

    d.diff = diffPercentage;
  }

  data = data.filter(d => d.otherPlayattemptsAverageDuration && d.myPlayattemptsAverageDuration);

  const difficulties = getDifficultyList();
  const maxDifficultySolved = Math.max(...data.map(d => d.difficulty).filter(x => x));
  const maxValue = Math.max(...data.map(d => d.diff || 0).filter(x => x));
  // remove the difficulties that are not solved
  const difficultiesToDisplay = difficulties.findLastIndex(d => d.value <= maxDifficultySolved);
  let max: number;

  if (difficultiesToDisplay === difficulties.length - 1) {
    max = maxDifficultySolved;
  } else {
    max = difficulties[difficultiesToDisplay + 1]?.value || difficulties[difficulties.length - 1].value;
  }

  return (<>
    <div className='flex flex-col gap-2'>
      <h2 className='text-xl font-bold'>Solve Time Comparisons</h2>
      <p className='text-sm'>
        This chart shows solve time vs average solve time for the levels {user.name} has solved in the last 6 months (max 500).
        <br />
        Green indicates it took {user.name} less time to solve the level than the average user.
      </p>
    </div>
    <div className='w-full' key={'difficultycomparsion-chart'}>
      <ResponsiveContainer width='100%' height={400} >
        <ScatterChart margin={
          {
            top: 10, right: 30, bottom: 10, left: 50,
          }
        }>
          <XAxis dataKey='difficulty' type='number'
            scale={'sqrt'}
            name='Difficulty'
            domain={[0, max]}
            // show the word difficulty
            label={{ value: 'Difficulty', position: 'insideBottom', offset: 10 }}
            // disable the ticks
            tick={false}
          />
          <YAxis dataKey='diff' type='number'
          // disable the y axis
            hide={false}
            // hide the ticks
            tick={false}
            width={20}
            scale={'sqrt'}
            domain={[-maxValue, maxValue]}
            // put two labels, Solver Faster on top and Solved Slower on bottom.
            label={{ value: '<- ...Slower... ^ ...Faster... ->', offset: 0, angle: -90, }}

          />
          {/* add ability to zoom */}
          <Brush dataKey='difficulty' height={30} stroke='#8884d8' />
          <ReferenceLine y={0} stroke='white' />
          {

            difficulties.map((d, i) => {
              const color = getDifficultyColor(d.value);
              let x2 = difficulties[i + 1]?.value;

              if (!x2) {
                x2 = max;
              }

              if (d.name === 'Pending') {
                return;
              }

              return (
                <ReferenceArea key={'refline-' + i} x1={d.value} x2={x2} stroke='white' fill={color} opacity={0.25}
                // show the word difficulty vertical
                  label={{ value: d.name, position: 'insideRight', offset: 10, angle: 90 }}
                />
              );
            })
          }
          <Tooltip
            content={
              ({ active, payload }) => {
                if (active && payload && payload[0] && payload[0].payload) {
                  const name = payload[0].payload.name;
                  const difficulty = payload[0].payload.difficulty;
                  const ts = payload[0].payload.ts * 1000;
                  const diff = payload[0].payload.diff;
                  const timeTakenForOthersToSolve = moment.duration(payload[0].payload.otherPlayattemptsAverageDuration * 1000).humanize();
                  const timeTakenToSolve = moment.duration(payload[0].payload.myPlayattemptsAverageDuration * 1000).humanize();

                  return (
                    <div className='p-2 bg-gray-800 text-sm'>
                      <span className='font-bold'>{`${name} (${getDifficultyFromValue(difficulty).name})`}</span>.<div className='flex flex-col'><span>You: <span className='font-bold'>{timeTakenToSolve}</span></span><span>Others: <span className='font-bold'>{timeTakenForOthersToSolve}</span></span></div><span className='text-xs'>{`${Math.abs(diff).toFixed(1)}x ${(diff < 0 ? 'slower' : 'faster')} than average`}<br />You solved <span className='font-bold text-xs'>{moment(ts).fromNow()}</span></span>
                    </div>
                  );
                }
              }
            }
            wrapperStyle={{ outline: 'none' }}
          />
          <Scatter name={user.name} data={data} key='scatterchart'
            // make the cursor a hand
            cursor='pointer'
            onClick={(e) => {
              router.push('/level/' + e.slug);
            }}
            // conditional color red if diff is negative, green if positive
            shape={({ cx, cy, diff, ...rest }) => {
              const percent = Math.min(Math.max(diff / 10, -1), 1);
              const fill = dotColor(percent);
              //const fill = diff < 0 ? 'red' : 'green';

              return (
                <Symbols
                  cx={cx}
                  cy={cy}
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
