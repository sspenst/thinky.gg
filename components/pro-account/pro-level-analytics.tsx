import { Tab } from '@headlessui/react';
import moment from 'moment';
import React, { useContext } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ProStats } from '../../contexts/levelContext';

export function dynamicDurationDisplay(sum: number) {
  /* show either minutes or hours */
  if (sum < 60) {
    return sum + 's';
  }
  else if (sum < 3600) {
    return moment.duration(sum, 'seconds').asMinutes().toFixed(0) + 'm';
  }
  else {
    return moment.duration(sum, 'seconds').asHours().toFixed(1) + 'h';
  }
}

export const ProLevelAnalytics = ({ prostats }: {prostats: ProStats}) => {
  const table = (
    <table className='table-auto'>
      <thead>
        <tr>
          <th className='px-4 py-2'>Date</th>
          <th className='px-4 py-2'>Est. Time Played</th>
        </tr>
      </thead>
      <tbody>
        {
          prostats?.playAttemptData.map((d, i) => {
            return (
              <tr key={'prostat-playattemptgraph-' + i}>
                <td key={i + '-date'} className='border px-4 py-2'>{moment(new Date(d.date)).format('M/D/YY')}</td>
                <td key={i + '-sum'} className='border px-4 py-2'>{dynamicDurationDisplay(d.sum)}</td>
              </tr>
            );
          })
        }
        <tr key={'prostat-playattemptgraph-total'}>
          <td key={'total-date'} className='border px-4 py-2'>Total</td>
          <td key={'total-sum'} className='border px-4 py-2'>{dynamicDurationDisplay(prostats?.playAttemptData.reduce((a, b) => a + b.sum, 0))}</td>
        </tr>
      </tbody>

    </table>);

  const reChart = (
    <div className='w-full'>
      <ResponsiveContainer width='100%' height={300}>
        <BarChart
          data={prostats?.playAttemptData}

        >
          <Bar dataKey='sum' fill='var(--bg-color-4)' />
          <CartesianGrid strokeDasharray='3 3' />
          <XAxis dataKey='date'
            tickFormatter={(date) => moment(new Date(date)).format('M/D/YY')} // short year would be 'YY'
          />
          <YAxis
            type='number'
            tickFormatter={(sum) => dynamicDurationDisplay(sum)}
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
          <Legend />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div>

      <div className='flex flex-col mt-2 items-center'>
        <span className='font-bold text-md'>Pro Analytics</span>

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

                <Tab.Panel className='px-4 py-2  shadow-md'>
                  {reChart}
                </Tab.Panel>
                <Tab.Panel className='px-4 py-2 shadow-md'>
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
