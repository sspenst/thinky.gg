import moment from 'moment';
import { useRouter } from 'next/router';
import React from 'react';
import { ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Symbols, Tooltip, XAxis, YAxis } from 'recharts';
import { DifficultyLevelComparison } from '../../hooks/useProStatsUser';
import User from '../../models/db/user';
import { getDifficultyColor, getDifficultyFromValue, getDifficultyList } from '../difficultyDisplay';

function dotColor(percent: number) {
  const hue = 120 * (percent + 1) / 2; // Hue value will be between 0 (red) and 120 (green)
  const saturation = 100 * Math.abs(percent); // Saturation will be between 50% (dark) and 100% (bright)
  const lightness = 50; // Set lightness to 50% to get neither too dark nor too light colors

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export const DifficultyLevelsComparisonsChart = ({ user, data }: {user: User, data: DifficultyLevelComparison[]}) => {
  // draw a scatter plot with a difficulty bucket on the x axis and the two dots on the y axis for the difficulty and average duration

  for (const d of data) {
    const diff = d.difficultyAdjusted - d.averageDuration;

    d.diff = diff;
  }

  data = data.filter(d => d.difficultyAdjusted && d.averageDuration);

  const router = useRouter();
  const difficulties = getDifficultyList();

  const maxDifficultySolved = Math.max(...data.map(d => d.difficulty).filter(x => x));

  // remove the difficulties that are not solved
  const difficultiesToDisplay = difficulties.findLastIndex(d => d.value <= maxDifficultySolved);
  let max: number;

  if (difficultiesToDisplay === difficulties.length - 1) {
    max = maxDifficultySolved;
  } else {
    max = difficulties[difficultiesToDisplay + 1]?.value || difficulties[difficulties.length - 1].value;
  }

  return (
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
            // put two labels, Solver Faster on top and Solved Slower on bottom.
            label={{ value: '<- ...Slower... ^ ...Faster... ->', offset: 0, angle: -90, }}

          />
          <ReferenceLine y={0} stroke='white' />
          {

            difficulties.map((d, i) => {
              const color = getDifficultyColor(d.value);
              let x2 = difficulties[i + 1]?.value;

              if (!x2) {
                x2 = max;
              }

              return (
                <ReferenceArea key={'refline-' + i} x1={d.value} x2={x2} stroke='white' fill={color} opacity={0.25}
                // show the word difficulty vertical
                  label={{ value: d.name, position: 'insideRight', offset: 10, angle: 90 }}
                />
              );
            })
          }
          <Tooltip content={
            ({ active, payload }) => {
              if (active && payload && payload.length) {
                const name = payload && payload[0] && payload[0].payload && payload[0].payload.name;
                const difficulty = payload && payload[0] && payload[0].payload && payload[0].payload.difficulty;
                const ts = payload && payload[0] && payload[0].payload && payload[0].payload.ts * 1000;

                return <div key={'tooltip-' + name + '-' + difficulty}
                  className='p-2 bg-gray-800'>{name + ' (' + getDifficultyFromValue(difficulty).name + ') solved ' + moment(ts).fromNow()}
                </div>;
              }
            }
          } />

          <Scatter name={user.name} data={data as any} key='scatterchart'
            // make the cursor a hand
            cursor='pointer'
            onClick={(e) => {
              router.push('/level/' + e.slug);
            }}
            // conditional color red if diff is negative, green if positive
            shape={({ cx, cy, diff, ...rest }) => {
              const percent = Math.min(Math.max(diff / 500, -1), 1);

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
  );
};
