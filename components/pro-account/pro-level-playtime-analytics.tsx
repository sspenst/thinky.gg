import { Tab } from '@headlessui/react';
import moment from 'moment';
import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ProStatsLevel } from '../../contexts/levelContext';
import { ProStatsLevelType } from '../../hooks/useProStatsLevel';

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

export const ProLevelPlayTimeAnalytics = ({ prostats }: {prostats: ProStatsLevel}) => {
  const table = (
    <div>
      <div className='flex flex-col'>
        <div className='flex flex-row items-center mb-2'>
          <div className='p-1 flex-1'>Date</div>
          <div className='p-1 flex-1'>Est. Time Played</div>
        </div>
      </div>
      <div>
        {
          prostats && prostats[ProStatsLevelType.PlayAttemptsOverTime] && prostats[ProStatsLevelType.PlayAttemptsOverTime].map((d, i) => {
            return (
              <div key={'prostat-playattemptgraph-' + i} className='flex flex-row gap-4'>
                <div key={i + '-date'} className='text-left w-1/3'>{moment(new Date(d.date)).format('M/D/YY')}</div>
                <div key={i + '-sum'} className='p-1 w-full flex flex-col text-center'>{dynamicDurationDisplay(d.sum)}</div>
              </div>
            );
          })
        }
        <div key='prostat-playattemptgraph-total' className='flex flex-row gap-2'>
          <div key={'total-date'} className=''>Total</div>
          <div key={'total-sum'} className=''>{prostats && prostats[ProStatsLevelType.PlayAttemptsOverTime] && dynamicDurationDisplay(prostats[ProStatsLevelType.PlayAttemptsOverTime].reduce((a, b) => a + b.sum, 0))}</div>
        </div>
      </div>

    </div>);

  const reChart = (
    <div className='w-full'>
      <ResponsiveContainer width='100%' height={300}>
        <BarChart
          data={prostats[ProStatsLevelType.PlayAttemptsOverTime]}
          title='Est. Time Played'
          maxBarSize={30}
        >
          <Bar dataKey='sum' fill='var(--bg-color-4)' />
          <CartesianGrid strokeDasharray='3 3' vertical={false} />
          <XAxis dataKey='date'
            padding={{ left: 15, right: 15 }}
            angle={-45}
            interval={0}
            tick={{ fill: 'white', fontSize: '0.75rem' }}
            // move y position down 5 pixels
            tickMargin={5}
            tickFormatter={(date) => moment(new Date(date)).format('M/D')} // short year would be 'YY'
          />
          <YAxis
            width={40}
            tick={{ fill: 'white', fontSize: '0.75rem' }}
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

        {prostats ? (
        // tab group needs to be wrapped in a div
          <div className='w-full'>
            <Tab.Group>
              <Tab.List className='flex text-xs gap-3 justify-center'>

                <Tab className='p-2 bg-gray-400  hover:bg-blue-600 rounded-md ui-selected:bg-blue-600'>
                  Graph
                </Tab>
                <Tab className='p-2 bg-gray-400 hover:bg-blue-600 rounded-md ui-selected:bg-blue-600'>
                  Table
                </Tab>

              </Tab.List>
              <Tab.Panels>

                <Tab.Panel>
                  {reChart}
                </Tab.Panel>
                <Tab.Panel className='mt-4'>
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
