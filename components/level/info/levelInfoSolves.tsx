import { Tab } from '@headlessui/react';
import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import classNames from 'classnames';
import Link from 'next/link';
import React, { Fragment, useContext } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ProStatsLevelType from '../../../constants/proStatsLevelType';
import { LevelContext } from '../../../contexts/levelContext';
import getProfileSlug from '../../../helpers/getProfileSlug';

export default function LevelInfoSolves() {
  const levelContext = useContext(LevelContext);
  const prostats = levelContext?.prostats;
  const { user } = useContext(AppContext);

  if (!isPro(user)) {
    return (
      <div className='text-sm'>
        Get <Link href='/settings/proaccount' className='text-blue-300'>
          Pathology Pro
        </Link> to see all solves for this level.
      </div>
    );
  }

  if (!prostats || !prostats[ProStatsLevelType.CommunityStepData] || prostats[ProStatsLevelType.CommunityStepData].length === 0) {
    return <div className='text-sm'>No solve data available.</div>;
  }

  const table = (
    <div className='flex flex-col gap-1'>
      {prostats[ProStatsLevelType.CommunityStepData].map((d, i) => {
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
    <div className='flex flex-col w-full gap-2'>
      <Tab.Group>
        <Tab.List className='flex flex-wrap gap-x-1 items-start rounded text-sm'>
          <Tab as={Fragment}>
            {({ selected }) => (
              <button className={classNames(
                'border-blue-500 focus:outline-none',
                { 'border-b-2 ': selected }
              )}>
                <div className='mb-1 py-1 px-2 hover:bg-neutral-600 rounded'>
                  Table
                </div>
              </button>
            )}
          </Tab>
          <Tab as={Fragment}>
            {({ selected }) => (
              <button className={classNames(
                'border-blue-500 focus:outline-none',
                { 'border-b-2 ': selected }
              )}>
                <div className='mb-1 py-1 px-2 hover:bg-neutral-600 rounded'>
                  Graph
                </div>
              </button>
            )}
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
  );
}
