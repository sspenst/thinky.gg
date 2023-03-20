import classNames from 'classnames';
import moment from 'moment';
import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import Level from '../models/db/level';
import MultiplayerMatch from '../models/db/multiplayerMatch';
import { UserWithMultiplayerProfile } from '../models/db/user';
import { MatchAction, MatchLogDataLevelComplete, MatchLogDataUserLeveId } from '../models/MultiplayerEnums';

interface MatchChartProps {
  match: MultiplayerMatch;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomizedDot = (props: any) => {
  const { cx, cy, payload } = props;

  if (cy !== null) {
    if (payload.type === MatchAction.COMPLETE_LEVEL) {
      return (<>
        <svg x={cx - 5} y={cy - 5} width={20} height={20} fill='var(--bg-color)' viewBox='0 0 32 32'>
          <circle cx='9' cy='9' r='9' />
        </svg>
        <svg x={cx - 4} y={cy - 4} width={20} height={20} fill='rgb(34 197 94)' viewBox='0 0 32 32'>
          <circle cx='7' cy='7' r='7' />
        </svg>
      </>);
    } else if (payload.type === MatchAction.SKIP_LEVEL) {
      return (<>
        <svg x={cx - 5} y={cy - 5} width={20} height={20} fill='var(--bg-color)' viewBox='0 0 32 32'>
          <circle cx='9' cy='9' r='9' />
        </svg>
        <svg x={cx - 4} y={cy - 4} width={20} height={20} fill='rgb(59 130 246)' viewBox='0 0 32 32'>
          <circle cx='7' cy='7' r='7' />
        </svg>
      </>);
    }
  }

  return null;
};

// https://recharts.org/en-US/examples/CustomizedDotLineChart
export default function MatchChart({ match }: MatchChartProps) {
  if (!match.matchLog) {
    return null;
  }

  const chartData = [];
  const playerMap = {} as { [id: string]: UserWithMultiplayerProfile };

  for (const player of match.players) {
    playerMap[player._id.toString()] = player;

    // add initial scores for each user
    chartData.push({
      time: 0,
      type: MatchAction.GAME_START,
      user: player.name,
      [player.name]: 0,
    });
  }

  const playerScore = {} as { [id: string]: number };

  for (let i = 0; i < match.matchLog.length; i++) {
    const log = match.matchLog[i];

    if (![MatchAction.COMPLETE_LEVEL, MatchAction.SKIP_LEVEL].includes(log.type as MatchAction)) {
      continue;
    }

    let completedBy = (log.data as MatchLogDataUserLeveId)?.userId?.toString();
    const level = (log.data as MatchLogDataLevelComplete)?.levelId?.toString(); // For gamestart and gameend this will be undefined

    if (log.type === MatchAction.COMPLETE_LEVEL){
      completedBy = (log.data as MatchLogDataLevelComplete).userId.toString();
      playerScore[completedBy] = playerScore[completedBy] ? playerScore[completedBy] + 1 : 1;
    }

    const timestamp = new Date(log.createdAt).getTime() - new Date(match.startTime).getTime();

    if (timestamp < 0) {
      continue;
    }

    chartData.push({
      name: (match.levels as Level[])?.find(l => l._id.toString() === level)?.name,
      time: timestamp,
      type: log.type,
      user: playerMap[completedBy]?.name,
      [playerMap[completedBy]?.name]: playerScore[completedBy],
    });
  }

  const maxScore = Object.values(playerScore).reduce((acc, score) => Math.max(acc, score), 0);

  return (<>
    <LineChart width={400} height={400} data={chartData} >
      <Line
        connectNulls
        dataKey={playerMap[match.players[0]._id.toString()].name}
        dot={<CustomizedDot />}
        isAnimationActive={false}
        stroke='rgb(234 179 8)'
        type='monotone'
      />
      <Line
        connectNulls
        dataKey={playerMap[match.players[1]._id.toString()].name}
        dot={<CustomizedDot />}
        isAnimationActive={false}
        stroke='rgb(168 85 247)'
        type='monotone'
      />
      <XAxis
        dataKey='time'
        scale='linear'
        tickFormatter={timeStr => moment(timeStr).format('m:ss')}
        ticks={[0, 30000, 60000, 90000, 120000, 150000, 180000]}
        type='number'
      />
      <YAxis
        interval={0}
        tickCount={maxScore + 1}
      />
      <CartesianGrid
        opacity={0.5}
        stroke='var(--bg-color-4)'
        strokeDasharray='1 9'
        vertical={false}
      />
      <Legend />
      <Tooltip
        content={
          ({ active, payload }) => {
            if (active && payload && payload.length) {
              const payloadObj = payload[0].payload;

              if (payloadObj.time === 0) {
                return;
              }

              return (
                <div className={classNames('p-2 border rounded', payloadObj.type === MatchAction.COMPLETE_LEVEL ? 'border-green-500' : 'border-blue-500')} style={{
                  backgroundColor: 'var(--bg-color)',
                }}>
                  {`${moment(payloadObj.time).format('m:ss')}`}: {payloadObj.user} <span className='font-bold'>{payloadObj.type === MatchAction.COMPLETE_LEVEL ? 'completed' : 'skipped'}</span> {`Level ${payloadObj.name}`}
                </div>
              );
            }
          }
        }
        wrapperStyle={{ outline: 'none' }}
      />
    </LineChart>
  </>
  );
}
