import { Tab } from '@headlessui/react';
import FormattedUser from '@root/components/formattedUser';
import Dimensions from '@root/constants/dimensions';
import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import classNames from 'classnames';
import Link from 'next/link';
import React, { Fragment, useContext } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ProStatsLevelType from '../../../constants/proStatsLevelType';
import { LevelContext } from '../../../contexts/levelContext';

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

  const solveDivs = [];

  for (let i = 0; i < prostats[ProStatsLevelType.CommunityStepData].length; i++) {
    const solve = prostats[ProStatsLevelType.CommunityStepData][i];

    for (let j = 0; j < solve.users.length; j++) {
      const user = solve.users[j];

      solveDivs.push(
        <div
          className='flex gap-2 items-center'
          key={`solve-${solve.moves}-${user._id.toString()}`}
        >
          <span className='font-bold w-11 text-right'>{j === 0 ? solve.moves : null}</span>
          <FormattedUser size={Dimensions.AvatarSizeSmall} user={user} />
          {/* <span className='text-sm' style={{
            color: 'var(--color-gray)',
          }}>{getFormattedDate(record.ts)}</span> */}
        </div>
      );
    }

    if (solve.users.length < solve.count) {
      solveDivs.push(
        <div
          className='flex gap-2 items-center'
          key={`solve-${solve.moves}-others`}
        >
          <span className='font-bold w-11 text-right' />
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
            <path strokeLinecap='round' strokeLinejoin='round' d='M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z' />
          </svg>
          <span className='text-sm italic'>
            +{solve.count - solve.users.length} others
          </span>
        </div>
      );
    }
  }

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
            {solveDivs}
          </Tab.Panel>
          <Tab.Panel>
            {reChart}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
