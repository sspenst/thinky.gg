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

  // use recharts to create a score chart over time
  return (
    <div className='w-full'>
      <ResponsiveContainer width='100%' height={300}>
        <LineChart title='Score History' data={mergedData}>
          <Line name={user.name + ' Solved'} dot={false} connectNulls dataKey='sum' stroke='darkgreen' yAxisId='left' />
          <Line name={user.name + ' Total'} dot={false} connectNulls dataKey='cumulativeSum' stroke='rgba(75, 192, 192)' yAxisId='right' />
          {compareData && (
            <>
              <Line connectNulls name={compareUser?.name + ' Solved'} dot={false} dataKey='sumCompare' stroke='gray' yAxisId='left' />
              <Line connectNulls name={compareUser?.name + ' Total'} dot={false} dataKey='cumulativeSumCompare' stroke='rgba(192, 75, 75)' yAxisId='right' />
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
          <YAxis
            yAxisId='left'
            width={40}
            tick={{ fill: 'white', fontSize: '0.75rem' }}
            type='number'
            tickFormatter={(sum) => sum}
            orientation='left'
          />
          <YAxis
            yAxisId='right'
            width={40}
            tick={{ fill: 'white', fontSize: '0.75rem' }}
            type='number'
            tickFormatter={(sum) => sum}
            orientation='right'
          />
          <Tooltip
            cursor={false}
            content={
              ({ active, payload }) => {
                if (active && payload && payload.length) {
                  const payloadObj = payload[0].payload;

                  console.log(payloadObj);

                  const daySum = payloadObj.sum;
                  const totalSolved = payloadObj.cumulativeSum;

                  const daySumCompare = payloadObj.sumCompare;
                  const totalSolvedCompare = payloadObj.cumulativeSumCompare;
                  const items = [];

                  items.push(<div>{moment(new Date(payloadObj.date)).format('M/D/YY')}</div>);

                  {user && daySum && totalSolved && (
                    items.push(<div>{user.name} solved {daySum} levels (Total solved: {totalSolved})</div>)
                  );}

                  {compareUser && daySumCompare && totalSolvedCompare && (
                    items.push(<div>{compareUser.name} solved {daySumCompare} levels (Total solved: {totalSolvedCompare})</div>)
                  );}

                  return (
                    <div className='p-2 border rounded' style={{
                      backgroundColor: 'var(--bg-color)',
                    }}>
                      <div className='flex flex-col'>
                        {items}
                      </div>
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
