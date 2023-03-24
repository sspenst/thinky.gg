import { Tab } from '@headlessui/react';
import Link from 'next/link';
import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ProStatsLevelType from '../../constants/proStatsLevelType';
import { ProStatsLevel } from '../../contexts/levelContext';
import getProfileSlug from '../../helpers/getProfileSlug';

export const ProLevelStepBucketAnalytics = ({ prostats }: {prostats: ProStatsLevel}) => {
  const table = (
    <div className=''>

      <div className='flex flex-col'>
        <div className='flex flex-row items-center mb-2'>
          <div className='p-1 flex-1'>Step</div>
          <div className='p-1 flex-1'>Users</div>
        </div>

      </div>
      <div className=''>
        {
          prostats && prostats[ProStatsLevelType.CommunityStepData] && prostats[ProStatsLevelType.CommunityStepData].map((d, i) => {
            return (
              <div key={'prostat-communitystep-' + i} className='flex flex-row gap-4'>
                <div key={i + '-step'} className='text-left w-1/3'>{d.moves} steps</div>
                <div key={i + '-count'} className='p-1 w-full flex flex-col'>
                  <span className=''>{d.count} users</span>
                  <div className='flex flex-1 gap-1 text-xs flex-wrap'>
                    {d.users.map((user) => {
                      return (
                        <div key={'stepbucket-table-user ' + user._id.toString()}>
                          <Link href={getProfileSlug(user)} className='text-blue-400'>
                            {user.name}
                          </Link>
                        </div>
                      );
                    })}
                    { /* if there are more users than we can show, show a count of the rest*/ }
                    {d.users.length < d.count && (
                      <div className=''>
                        +{d.count - d.users.length} others
                      </div>
                    )}

                  </div>
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
  const ticks = prostats[ProStatsLevelType.CommunityStepData]?.map((d) => d.moves);
  const minTick = ticks ? Math.min(...ticks) : 0;
  const maxTick = ticks ? Math.max(...ticks) : 0;
  const reChart = (
    <div className='w-full'>
      <ResponsiveContainer width='100%' height={300}>
        <BarChart
          data={prostats[ProStatsLevelType.CommunityStepData]}
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
            width={25}

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
