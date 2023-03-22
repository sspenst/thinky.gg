import { Tab } from '@headlessui/react';
import moment from 'moment';
import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ProStats } from '../../contexts/levelContext';
import { ProStatsType } from '../../hooks/useProStats';

export function dynamicDurationDisplay(sum: number, toFixedM = 0, toFixedH = 0) {
  /* show either minutes or hours */
  if (sum < 60) {
    return sum + 's';
  }
  else if (sum < 3600) {
    return moment.duration(sum, 'seconds').asMinutes().toFixed(toFixedM) + 'm';
  }
  else {
    return moment.duration(sum, 'seconds').asHours().toFixed(toFixedH) + 'h';
  }
}

export const ProLevelPlayTimeAnalytics = ({ prostats }: {prostats: ProStats}) => {
  const table = (
    <table className='table-auto'>
      <thead>
        <tr>
          <th>Date</th>
          <th>Est. Time Played</th>
        </tr>
      </thead>
      <tbody>
        {
          prostats && prostats[ProStatsType.PlayAttemptsOverTime] && prostats[ProStatsType.PlayAttemptsOverTime].map((d, i) => {
            return (
              <tr key={'prostat-playattemptgraph-' + i}>
                <td key={i + '-date'} className='border'>{moment(new Date(d.date)).format('M/D/YY')}</td>
                <td key={i + '-sum'} className='border'>{dynamicDurationDisplay(d.sum)}</td>
              </tr>
            );
          })
        }
        <tr key={'prostat-playattemptgraph-total'}>
          <td key={'total-date'} className='border'>Total</td>
          <td key={'total-sum'} className='border'>{prostats && prostats[ProStatsType.PlayAttemptsOverTime] && dynamicDurationDisplay(prostats[ProStatsType.PlayAttemptsOverTime].reduce((a, b) => a + b.sum, 0))}</td>
        </tr>
      </tbody>

    </table>);

  const reChart = (
    <div className='w-full'>
      <ResponsiveContainer width='100%' height={300}>
        <BarChart
          data={prostats[ProStatsType.PlayAttemptsOverTime]}
          title='Est. Time Played'
        >
          <Bar dataKey='sum' fill='var(--bg-color-4)' />
          <CartesianGrid strokeDasharray='3 3' />
          <XAxis dataKey='date'
            tickFormatter={(date) => moment(new Date(date)).format('M/D/YY')} // short year would be 'YY'
          />
          <YAxis

            type='number'
            tickFormatter={(sum) => dynamicDurationDisplay(sum, 1, 1)}
          />
          <Tooltip
            cursor={false}
            content={
              ({ active, payload }) => {
                if (active && payload && payload.length) {
                  const payloadObj = payload[0].payload;

                  const display = dynamicDurationDisplay(payloadObj.sum);

                  return (
                    <div className='p-2 border rounded' style={{
                      backgroundColor: 'var(--bg-color)',
                    }}>
                      {`${moment(new Date(payloadObj.date)).format('M/D/YY')} [${display}]`}
                    </div>
                  );
                }
              }
            }
          />

        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div>

      <div className='flex flex-col mt-2 items-center'>
        <span className='font-bold text-md'>Playtime</span>

        {prostats ? (
        // tab group needs to be wrapped in a div
          <div className=' py-4 w-full'>
            <Tab.Group>
              <Tab.List className='flex text-sm gap-4 justify-center'>

                <Tab className='rounded-md'>
                  Graph
                </Tab>
                <Tab className='rounded-md'>
                  Table
                </Tab>

              </Tab.List>
              <Tab.Panels>

                <Tab.Panel>
                  {reChart}
                </Tab.Panel>
                <Tab.Panel>
                  {table}
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </div>

        ) : (
          <div><span>No data.</span></div>
        )}

      </div>

    </div>
  );
};
