import moment from 'moment';
import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DateAndSum } from '../../contexts/levelContext';
import User from '../../models/db/user';

const getCumulativeScores = (scores: DateAndSum[]): DateAndSum[] => {
  let cumulativeSum = 0;

  scores = scores.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return scores.map((score) => {
    cumulativeSum += score.sum;

    return { ...score, cumulativeSum };
  });
};
const mergeData = (data1: DateAndSum[], data2: DateAndSum[]): any[] => {
  const combinedData = [...data1, ...data2];
  const uniqueDates = Array.from(new Set(combinedData.map(item => item.date))).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return uniqueDates.map(date => {
    const item1 = data1.find(item => item.date === date);
    const item2 = data2.find(item => item.date === date);

    const result: any = { date };

    if (item1) {
      result.sum = item1.sum;
      result.cumulativeSum = (item1 as any).cumulativeSum;
    }

    if (item2) {
      result.sumCompare = item2.sum;
      result.cumulativeSumCompare = (item2 as any).cumulativeSum;
    }

    return result;
  });
};

export const ScoreChart = ({ user, compareUser, scores, compareData }: {user: User, scores: DateAndSum[], compareUser?: User | null, compareData?: DateAndSum[]}) => {
  const cumulativeScores = getCumulativeScores(scores);
  const cumulativeScoresCompare = getCumulativeScores(compareData || []);
  const mergedData = mergeData(cumulativeScores, cumulativeScoresCompare);

  const [enableCumulative, setEnableCumulative] = React.useState(false);
  const [enableDaily, setEnableDaily] = React.useState(true);

  // use recharts to create a score chart over time
  return (

    <div className='w-full'>
      {/* add two toggle buttons for enableCumalative and enableDaily */}
      <div className='flex flex-row justify-center'>
        <div className='flex flex-row gap-2'>
          <div className='flex flex-row items-center'>
            <input type='checkbox' checked={enableCumulative} onChange={(e) => setEnableCumulative(e.target.checked)} />
            <div className='ml-2'>Cumulative</div>
          </div>
          <div className='flex flex-row items-center'>
            <input type='checkbox' checked={enableDaily} onChange={(e) => setEnableDaily(e.target.checked)} />
            <div className='ml-2'>Daily</div>
          </div>
        </div>
      </div>

      <ResponsiveContainer width='100%' height={300}>
        <LineChart title='Score History' data={mergedData}>
          {enableDaily && <Line name={user.name + ' Daily Solved'} dot={false} connectNulls dataKey='sum' stroke='darkgreen' yAxisId='left' />}
          {enableCumulative && <Line name={user.name + ' Total'} dot={false} connectNulls dataKey='cumulativeSum' stroke='rgba(75, 192, 192)' yAxisId='right' />}
          {compareData && (
            <>
              {enableDaily && <Line connectNulls name={compareUser?.name + ' Daily'} dot={false} dataKey='sumCompare' stroke='gray' yAxisId='left' />}
              {enableCumulative && <Line connectNulls name={compareUser?.name + ' Total'} dot={false} dataKey='cumulativeSumCompare' stroke='rgba(192, 75, 75)' yAxisId='right' />}
            </>
          )}

          <Legend verticalAlign='top' height={36} />
          <CartesianGrid strokeDasharray='3 3' vertical={false} />
          <XAxis dataKey='date'
            padding={{ left: 15, right: 15 }}
            tickFormatter={(date) => moment(new Date(date)).format('M/D')}
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

                  items.push(<div key='tooltip-scorechart-t'>{moment(new Date(payloadObj.date)).format('M/D/YY')}</div>);

                  {user && daySum && totalSolved && (
                    items.push(<div key='tooltip-scorechart-a'>{user.name} solved {daySum} levels (Total solved: {totalSolved})</div>)
                  );}

                  {compareUser && daySumCompare && totalSolvedCompare && (
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
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
