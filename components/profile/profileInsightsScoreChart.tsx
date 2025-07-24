import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DateAndSum } from '../../contexts/levelContext';
import User from '../../models/db/user';
import MultiSelectUser from '../page/multiSelectUser';
import { TimeFilter } from './profileInsights';

const getCumulativeScores = (scores: DateAndSum[]): DateAndSum[] => {
  let cumulativeSum = 0;

  scores = scores.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return scores.map((score) => {
    cumulativeSum += score.sum;

    return { ...score, cumulativeSum };
  });
};

const mergeData = (data1: DateAndSum[], data2: DateAndSum[]) => {
  const combinedData = [...data1, ...data2];
  const uniqueDates = Array.from(new Set(combinedData.map(item => item.date))).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return uniqueDates.map(date => {
    const item1 = data1.find(item => item.date === date);
    const item2 = data2.find(item => item.date === date);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = { date };

    if (item1) {
      result.sum = item1.sum;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.cumulativeSum = (item1 as any).cumulativeSum;
    }

    if (item2) {
      result.sumCompare = item2.sum;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.cumulativeSumCompare = (item2 as any).cumulativeSum;
    }

    return result;
  });
};

export default function ProfileInsightsScoreChart({ user, timeFilter }: { user: User; timeFilter?: TimeFilter }) {
  const [compareUser, setCompareUser] = useState<User | null>(null);
  const [enableCumulative, setEnableCumulative] = useState(false);
  const [enableDaily, setEnableDaily] = useState(true);
  const { proStatsUser: scoreChartData } = useProStatsUser(user, ProStatsUserType.ScoreHistory, timeFilter);
  const { proStatsUser: compareUserData } = useProStatsUser(compareUser, ProStatsUserType.ScoreHistory, timeFilter);
  const compareData = compareUserData?.[ProStatsUserType.ScoreHistory];

  const scores = scoreChartData?.[ProStatsUserType.ScoreHistory] as DateAndSum[] || [];

  const cumulativeScores = useMemo(() =>
    getCumulativeScores(scores), [scores]
  );

  const cumulativeScoresCompare = useMemo(() =>
    getCumulativeScores(compareData || []), [compareData]
  );

  const mergedData = useMemo(() =>
    mergeData(cumulativeScores, cumulativeScoresCompare),
  [cumulativeScores, cumulativeScoresCompare]
  );

  if (!scoreChartData || !scoreChartData[ProStatsUserType.ScoreHistory]) {
    return (
      <div className='flex flex-col gap-2'>
        <div className='h-6 bg-gray-700 rounded w-32 animate-pulse' />
        <div className='h-4 bg-gray-700 rounded w-96 animate-pulse' />
        <div className='h-4 bg-gray-700 rounded w-80 animate-pulse' />
        <div className='bg-gray-800 rounded-lg animate-pulse h-80 mt-4' />
      </div>
    );
  }

  // use recharts to create a score chart over time
  return (<>
    <div className='flex flex-col gap-2 max-w-full'>
      <h2 className='text-xl font-bold'>Score Chart</h2>
      <p className='text-sm break-words'>
        This chart shows the daily & cumulative solves over the last 90 days for {user.name}.<br />You can compare these stats against another user by selecting them below.
      </p>
    </div>
    <div className='w-full flex flex-col gap-2'>
      <div className='flex flex-row gap-2 justify-center align-center items-center p-1'>
        <MultiSelectUser
          className='min-w-40'
          onSelect={(user) => {
            setCompareUser(user);
          }}
          placeholder='Find a user to compare...'
        />
      </div>
      <div className='flex gap-4 justify-center'>
        <div className='flex gap-2'>
          <input id='score-chart-cumulative' type='checkbox' checked={enableCumulative} onChange={(e) => setEnableCumulative(e.target.checked)} />
          <label htmlFor='score-chart-cumulative'>Cumulative</label>
        </div>
        <div className='flex gap-2'>
          <input id='score-chart-daily' type='checkbox' checked={enableDaily} onChange={(e) => setEnableDaily(e.target.checked)} />
          <label htmlFor='score-chart-daily'>Daily</label>
        </div>
      </div>
      <ResponsiveContainer width='100%' height={300}>
        <ComposedChart title='Score History' data={mergedData}>
          {enableDaily && <Bar name={user.name + ' Daily Solved'} dataKey='sum' fill='lightgreen' yAxisId='left' />}
          {enableCumulative && <Line name={user.name + ' Total'} dot={false} connectNulls dataKey='cumulativeSum' stroke='rgba(75, 192, 192)' yAxisId='right' />}
          {compareData && compareData.length > 0 && (
            <>
              {enableDaily && <Bar name={compareUser?.name + ' Daily'} dataKey='sumCompare' fill='gray' yAxisId='left' />}
              {enableCumulative && <Line connectNulls name={compareUser?.name + ' Total'} dot={false} dataKey='cumulativeSumCompare' stroke='rgba(192, 75, 75)' yAxisId='right' />}
            </>
          )}
          <Legend verticalAlign='top' height={36} />
          <CartesianGrid strokeDasharray='3 3' vertical={false} />
          <XAxis dataKey='date'
            padding={{ left: 15, right: 15 }}
            tickFormatter={(date) => dayjs(new Date(date)).format('M/D')}
            angle={-45}
            tick={{ fill: 'white', fontSize: '0.75rem' }}
            tickMargin={5}
          />
          {enableDaily && <YAxis
            yAxisId='left'
            width={40}
            tick={{ fill: 'white', fontSize: '0.75rem' }}
            type='number'
            tickFormatter={(sum) => sum}
            orientation='left'
          />}
          {enableCumulative && <YAxis
            yAxisId='right'
            width={40}
            tick={{ fill: 'white', fontSize: '0.75rem' }}
            type='number'
            tickFormatter={(sum) => sum}
            orientation='right'
          />}
          <Tooltip
            cursor={false}
            content={
              ({ active, payload }) => {
                if (active && payload && payload.length) {
                  const payloadObj = payload[0].payload;
                  const daySum = payloadObj.sum;
                  const totalSolved = payloadObj.cumulativeSum;
                  const daySumCompare = payloadObj.sumCompare;
                  const totalSolvedCompare = payloadObj.cumulativeSumCompare;
                  const items = [];

                  items.push(<div key='tooltip-scorechart-t'>{dayjs(new Date(payloadObj.date)).format('M/D/YY')}</div>);

                  {user && (daySum !== undefined) && (totalSolved !== undefined) && (
                    items.push(<div key='tooltip-scorechart-a'>{user.name} solved {daySum} levels (Total solved: {totalSolved})</div>)
                  );}

                  {compareUser && (daySumCompare !== undefined) && (totalSolvedCompare !== undefined) && (
                    items.push(<div key= 'tooltip-scorechart-b'>{compareUser.name} solved {daySumCompare} levels (Total solved: {totalSolvedCompare})</div>)
                  );}

                  return (
                    <div className='p-2 border rounded flex flex-col'
                      style={{
                        backgroundColor: 'var(--bg-color)',
                      }}>
                      {items}
                    </div>
                  );
                }
              }
            }
            wrapperStyle={{ outline: 'none' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </>);
}
