import { Tab } from '@headlessui/react';
import React from 'react';
import { Bar, BarChart, CartesianGrid, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ProStats } from '../../contexts/levelContext';
import { ProStatsType } from '../../hooks/useProStats';

export const ProLevelStepBucketAnalytics = ({ prostats }: {prostats: ProStats}) => {
  const table = (
    <table className='table-auto'>
      <thead>
        <tr>
          <th className=''>Step</th>
          <th className=''>Users</th>
        </tr>
      </thead>
      <tbody>
        {
          prostats && prostats[ProStatsType.CommunityStepData] && prostats[ProStatsType.CommunityStepData].map((d, i) => {
            return (
              <tr key={'prostat-communitystep-' + i}>
                <td key={i + '-step'} className='border'>{d.moves}</td>
                <td key={i + '-users'} className='border'>{d.count}</td>
              </tr>
            );
          })
        }
      </tbody>

    </table>);
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
          <CartesianGrid strokeDasharray='3 3' />
          <XAxis dataKey='moves' type='number'
            // we want a tick for every 1 step
            padding={{ left: 20, right: 20 }}
            interval={0}
            ticks={prostats ? ticks : []}
            domain={[minTick, maxTick]}

          />
          <YAxis
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
                      Users with {payloadObj.moves}: {display}
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
        <span className='font-bold text-md'>Step Buckets</span>

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

                <Tab.Panel className=''>
                  {reChart}
                </Tab.Panel>
                <Tab.Panel className=''>
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
