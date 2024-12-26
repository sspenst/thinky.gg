import classNames from 'classnames';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { NameType, Payload } from 'recharts/types/component/DefaultTooltipContent';
import { MatchAction, MatchLogDataLevelComplete, MatchLogDataUserLeveId, MultiplayerMatchTypeDurationMap } from '../../models/constants/multiplayer';
import Level from '../../models/db/level';
import MultiplayerMatch from '../../models/db/multiplayerMatch';
import { UserWithMultiplayerProfile } from '../../models/db/user';

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

enum ChartView {
  PROGRESS = 'Progress',
  TIME_PER_LEVEL = 'Time per Level'
}

interface LevelTimeData {
  level: string;
  [key: string]: string | number | boolean; // for player names, times, and skipped flags
}

export default function MatchChart({ match }: MatchChartProps) {
  const [activeView, setActiveView] = useState<ChartView>(ChartView.PROGRESS);

  if (!match.matchLog || !match.players.length) {
    return null;
  }

  const chartData = [];
  const timePerLevelMap = new Map<string, LevelTimeData>();
  const playerMap = {} as { [id: string]: UserWithMultiplayerProfile };
  const lastLevelMap = {} as { [playerId: string]: string }; // Track last level for each player

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

  // Track last action time for each player to calculate time per level
  const lastActionTime = {} as { [id: string]: number };
  const playerScore = {} as { [id: string]: number };

  for (let i = 0; i < match.matchLog.length; i++) {
    const log = match.matchLog[i];

    if (![MatchAction.COMPLETE_LEVEL, MatchAction.SKIP_LEVEL].includes(log.type as MatchAction)) {
      continue;
    }

    let completedBy = (log.data as MatchLogDataUserLeveId)?.userId?.toString();
    const level = (log.data as MatchLogDataLevelComplete)?.levelId?.toString();
    const levelName = (match.levels as Level[])?.find(l => l._id.toString() === level)?.name;

    if (log.type === MatchAction.COMPLETE_LEVEL) {
      completedBy = (log.data as MatchLogDataLevelComplete).userId.toString();
      playerScore[completedBy] = playerScore[completedBy] ? playerScore[completedBy] + 1 : 1;
    }

    // Track the last level for this player
    if (completedBy && levelName) {
      lastLevelMap[completedBy] = levelName;
    }

    const timestamp = new Date(log.createdAt).getTime() - new Date(match.startTime).getTime();

    if (timestamp < 0 || !levelName) {
      continue;
    }

    // Calculate time spent on level
    if (lastActionTime[completedBy] !== undefined) {
      const timeSpent = timestamp - lastActionTime[completedBy];

      if (!timePerLevelMap.has(levelName)) {
        timePerLevelMap.set(levelName, {
          level: levelName,
          [`${playerMap[completedBy].name}_skipped`]: false,
        });
      }

      const levelData = timePerLevelMap.get(levelName);

      if (!levelData) continue;
      levelData[playerMap[completedBy].name] = timeSpent;
      levelData[`${playerMap[completedBy].name}_skipped`] = log.type === MatchAction.SKIP_LEVEL;
    }

    lastActionTime[completedBy] = timestamp;

    chartData.push({
      name: (match.levels as Level[])?.find(l => l._id.toString() === level)?.name,
      time: timestamp,
      type: log.type,
      user: playerMap[completedBy]?.name,
      [playerMap[completedBy]?.name]: playerScore[completedBy],
    });
  }

  // Mark last levels as incomplete
  for (const [levelName, levelData] of timePerLevelMap.entries()) {
    for (const playerId in playerMap) {
      if (lastLevelMap[playerId] === levelName) {
        levelData[`${playerMap[playerId].name}_incomplete`] = true;
      }
    }
  }

  const timePerLevelData = Array.from(timePerLevelMap.values());

  // add final scores to complete the line
  for (const playerId in playerMap) {
    chartData.push({
      time: MultiplayerMatchTypeDurationMap[match.type],
      type: MatchAction.GAME_END,
      user: playerMap[playerId].name,
      [playerMap[playerId].name]: playerScore[playerId],
    });
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='flex justify-center mb-4'>
        <div className='inline-flex rounded-md shadow-sm' role='group'>
          {Object.values(ChartView).map((view) => (
            <button
              key={view}
              type='button'
              onClick={() => setActiveView(view)}
              className={classNames(
                'px-4 py-2 text-sm font-medium border',
                'focus:z-10 focus:ring-2 focus:ring-blue-500 focus:outline-none',
                activeView === view
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-transparent hover:bg-blue-500/10 border-gray-500',
                'first:rounded-l-lg last:rounded-r-lg'
              )}
            >
              {view}
            </button>
          ))}
        </div>
      </div>
      <div className='flex-1'>
        <ResponsiveContainer width='100%' height='100%'>
          {activeView === ChartView.PROGRESS ? (
            <LineChart width={400} height={400} data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -20 }}>
              <Line
                connectNulls
                dataKey={playerMap[match.players[0]?._id.toString()]?.name}
                dot={<CustomizedDot />}
                isAnimationActive={false}
                stroke='rgb(234 179 8)'
                type='monotone'
              />
              <Line
                connectNulls
                dataKey={playerMap[match.players[1]?._id.toString()]?.name}
                dot={<CustomizedDot />}
                isAnimationActive={false}
                stroke='rgb(168 85 247)'
                type='monotone'
              />
              <XAxis
                dataKey='time'
                domain={[0, MultiplayerMatchTypeDurationMap[match.type]]}
                interval={0}
                tickFormatter={timeStr => dayjs(timeStr).format('m:ss')}
                type='number'
              />
              <YAxis />
              <CartesianGrid
                opacity={0.5}
                stroke='var(--bg-color-4)'
                strokeDasharray='3 9'
                vertical={false}
              />
              <Legend />
              <Tooltip
                content={
                  ({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const payloadObj = payload[0].payload;

                      if (![MatchAction.COMPLETE_LEVEL, MatchAction.SKIP_LEVEL].includes(payloadObj.type as MatchAction)) {
                        return;
                      }

                      return (
                        <div className={classNames('px-2 py-1 border rounded', payloadObj.type === MatchAction.COMPLETE_LEVEL ? 'border-green-500' : 'border-blue-500')} style={{
                          backgroundColor: 'var(--bg-color)',
                        }}>
                          {`${dayjs(payloadObj.time).format('m:ss')} [${payloadObj[payloadObj.user]}] ${payloadObj.user}`}  <span className='font-bold'>{payloadObj.type === MatchAction.COMPLETE_LEVEL ? 'completed' : 'skipped'}</span> {`${payloadObj.name}`}
                        </div>
                      );
                    }
                  }
                }
                wrapperStyle={{ outline: 'none' }}
              />
            </LineChart>
          ) : (
            <ComposedChart
              data={timePerLevelData}
              margin={{ top: 10, right: 20, bottom: 20, left: 0 }}
            >
              <CartesianGrid
                opacity={0.5}
                stroke='var(--bg-color-4)'
                strokeDasharray='3 9'
                vertical={false}
              />
              <XAxis
                dataKey='level'
                angle={-45}
                textAnchor='end'
                height={60}
              />
              <YAxis
                tickFormatter={value => dayjs(value).format('m:ss')}
              />
              <Tooltip
                formatter={(value: number) => dayjs(value).format('m:ss')}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className='px-2 py-1 border rounded border-gray-500' style={{
                        backgroundColor: 'var(--bg-color)',
                      }}>
                        <div className='font-medium'>{payload[0].payload.level}</div>
                        {payload.map((entry: Payload<number, NameType>, index) => {
                          const playerName = entry.dataKey;
                          const isSkipped = entry.payload[`${playerName}_skipped`];
                          const isIncomplete = entry.payload[`${playerName}_incomplete`];

                          return (
                            <div key={index} className='flex items-center gap-2'>
                              <div className={classNames(
                                'w-3 h-3 rounded-full',
                                (isSkipped || isIncomplete) ? 'border-2 bg-transparent' : ''
                              )}
                              style={{
                                backgroundColor: (isSkipped || isIncomplete) ? 'transparent' : entry.stroke,
                                borderColor: entry.stroke
                              }} />
                              {entry.name}: {dayjs(entry.value).format('m:ss')}
                              {isSkipped && <span className='text-sm text-gray-400'>(skipped)</span>}
                              {isIncomplete && <span className='text-sm text-gray-400'>(incomplete)</span>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return null;
                }}
              />
              {match.players.map((player, index) => {
                const playerName = playerMap[player._id.toString()]?.name;

                if (!playerName) return null;

                const color = index === 0 ? 'rgb(234 179 8)' : 'rgb(168 85 247)';

                return (
                  <Bar
                    key={playerName}
                    dataKey={playerName}
                    fill={color}
                    opacity={0.8}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    shape={(props: any) => {
                      const playerName = props.dataKey as string;
                      const isSkipped = props.payload[`${playerName}_skipped`];
                      const isIncomplete = props.payload[`${playerName}_incomplete`];

                      const pathData = `M ${props.x},${props.y + props.height} 
                                        L ${props.x},${props.y} 
                                        L ${props.x + props.width},${props.y} 
                                        L ${props.x + props.width},${props.y + props.height} Z`;

                      if (isSkipped || isIncomplete) {
                        return (
                          <path
                            d={pathData}
                            stroke={color}
                            strokeWidth={2}
                            fill='none'
                          />
                        );
                      }

                      return (
                        <path
                          d={pathData}
                          fill={color}
                          opacity={0.8}
                        />
                      );
                    }}
                  />
                );
              })}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
