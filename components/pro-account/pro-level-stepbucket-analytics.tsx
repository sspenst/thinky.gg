import { Tab } from '@headlessui/react';
import React from 'react';
import { Bar, BarChart, CartesianGrid, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ProStats } from '../../contexts/levelContext';
import { ProStatsType } from '../../hooks/useProStats';

export const ProLevelStepBucketAnalytics = ({ prostats }: {prostats: ProStats}) => {
  const table = (
    <table className='table-auto border-collapse border-0'>
      <thead>
        <tr>
          <th className='p-1'>Step</th>
          <th className='p-1'>Users</th>
        </tr>
      </thead>
      <tbody>
        {
          prostats && prostats[ProStatsType.CommunityStepData] && prostats[ProStatsType.CommunityStepData].map((d, i) => {
            return (
              <tr key={'prostat-communitystep-' + i}>
                <td key={i + '-step'} className='text-right'>{d.moves}</td>
                <td key={i + '-users'} className='text-right'>{d.count}</td>
              </tr>
            );
          })
        }
      </tbody>
    </table>
  );
  const ticks = prostats[ProStatsType.CommunityStepData]?.map((d) => d.moves);
  const minTick = ticks ? Math.min(...ticks) : 0;
  const maxTick = ticks ? Math.max(...ticks) : 0;
  const reChart = (
    <div className='w-full'>
      <ResponsiveContainer width='100%' height={300}>
        <BarChart
          data={prostats[ProStatsType.CommunityStepData]}
          maxBarSize={30}
        >
          <Bar dataKey='count' fill='var(--bg-color-4)'

          />
          <CartesianGrid strokeDasharray='1 4' vertical={false} />
          <XAxis dataKey='moves' type='number'
            // we want a tick for every 1 step
            padding={{ left: 15, right: 15 }}
            angle={-45}
            interval={0}
            ticks={prostats ? ticks : []}
            domain={[minTick, maxTick]}
            tickMargin={5}
            tick={{ fill: 'white', fontSize: '0.75rem' }}
          />
          {/* https://github.com/recharts/recharts/issues/843 */ }
          <YAxis
            width={20}

            // tick color white
            tick={{ fill: 'white', fontSize: '0.75rem' }}

            type='number'
          />
          <Tooltip
            cursor={false}
            content={
              ({ active, payload }) => {
                if (active && payload && payload.length) {
                  const payloadObj = payload[0].payload;

                  const display = payloadObj.count;

                  return (
                    <div className='p-2 border rounded' style={{
                      backgroundColor: 'var(--bg-color)',
                    }}>
                      Users with {payloadObj.moves} steps: {display}
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
          <div className='  w-full'>
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

                <Tab.Panel className=''>
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