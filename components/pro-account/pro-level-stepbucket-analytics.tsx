import { Tab } from '@headlessui/react';
import Link from 'next/link';
import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ProStatsLevelType from '../../constants/proStatsLevelType';
import { ProStatsLevel } from '../../contexts/levelContext';
import getProfileSlug from '../../helpers/getProfileSlug';

interface ProLevelStepBucketAnalyticsProps {
  prostats: ProStatsLevel;
}

export default function ProLevelStepBucketAnalytics({ prostats }: ProLevelStepBucketAnalyticsProps) {
  const table = (
    <div className='flex flex-col gap-1'>
      {prostats[ProStatsLevelType.CommunityStepData] && prostats[ProStatsLevelType.CommunityStepData].map((d, i) => {
        return (
          <div key={'prostat-communitystep-' + i} className='flex flex-row gap-4'>
            <div key={i + '-step'} className='text-left w-1/3'>{d.moves} steps</div>
            <div key={i + '-count'} className='w-full flex flex-col'>
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
      })}
    </div>
  );

  const reChart = (
    <div className='w-full'>
      <ResponsiveContainer width='100%' height={300}>
        <BarChart
          data={prostats[ProStatsLevelType.CommunityStepData]}
          maxBarSize={30}
        >
          <Bar dataKey='count' fill='var(--bg-color-4)' />
          <CartesianGrid strokeDasharray='1 4' vertical={false} />
          <XAxis
            angle={-45}
            dataKey='moves'
            tick={{ fill: 'white', fontSize: '0.75rem' }}
            tickMargin={5}
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
    <div className='flex flex-col items-center'>
      {prostats ? (
        // tab group needs to be wrapped in a div
        <div className='w-full'>
          <Tab.Group>
            <Tab.List className='flex text-xs gap-3 justify-center'>
              <Tab className='p-2 bg-gray-400 hover:bg-blue-600 rounded-md ui-selected:bg-blue-600'>
                Table
              </Tab>
              <Tab className='p-2 bg-gray-400  hover:bg-blue-600 rounded-md ui-selected:bg-blue-600'>
                Graph
              </Tab>
            </Tab.List>
            <Tab.Panels>
              <Tab.Panel>
                {table}
              </Tab.Panel>
              <Tab.Panel>
                {reChart}
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      ) : (
        <div>
          No data.
        </div>
      )}
    </div>
  );
}
