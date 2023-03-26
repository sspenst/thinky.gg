import { Tab } from '@headlessui/react';
import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import classNames from 'classnames';
import moment from 'moment';
import Link from 'next/link';
import React, { Fragment, useContext } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ProStatsLevelType from '../../../constants/proStatsLevelType';
import { LevelContext } from '../../../contexts/levelContext';

function dynamicDurationDisplay(sum: number, toFixedM = 0, toFixedH = 0) {
  /* show either minutes or hours */
  if (sum < 60) {
    return sum + 's';
  } else if (sum < 3600) {
    return moment.duration(sum, 'seconds').asMinutes().toFixed(toFixedM) + 'm';
  } else {
    return moment.duration(sum, 'seconds').asHours().toFixed(toFixedH) + 'h';
  }
}

export default function LevelInfoPlayTime() {
  const levelContext = useContext(LevelContext);
  const prostats = levelContext?.prostats;
  const { user } = useContext(AppContext);

  if (!isPro(user)) {
    return (
      <div className='text-sm'>
        Get <Link href='/settings/proaccount' className='text-blue-300'>
          Pathology Pro
        </Link> to see your play time for this level.
      </div>
    );
  }

  if (!prostats || !prostats[ProStatsLevelType.PlayAttemptsOverTime] || prostats[ProStatsLevelType.PlayAttemptsOverTime].length === 0) {
    return <div className='text-sm'>No play time data available.</div>;
  }

  const table = (
    <div>
      <div className='flex flex-row items-center mb-2'>
        <div className='flex-1'>Date</div>
        <div className='flex-1'>Est. Time Played</div>
      </div>
      <div>
        {
          prostats[ProStatsLevelType.PlayAttemptsOverTime].map((d, i) => {
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
          <div key={'total-sum'} className=''>{dynamicDurationDisplay(prostats[ProStatsLevelType.PlayAttemptsOverTime].reduce((a, b) => a + b.sum, 0))}</div>
        </div>
      </div>
    </div>
  );

  const reChart = (
    <ResponsiveContainer width='100%' height={300}>
      <BarChart
        data={prostats[ProStatsLevelType.PlayAttemptsOverTime]}
        title='Est. Time Played'
        maxBarSize={30}
      >
        <Bar dataKey='sum' fill='var(--bg-color-4)' />
        <CartesianGrid strokeDasharray='3 3' vertical={false} />
        <XAxis dataKey='date'
          angle={-45}
          interval={0}
          tick={{ fill: 'var(--color)', fontSize: '0.75rem' }}
          tickMargin={8}
          tickFormatter={(date) => moment(new Date(date)).format('M/D')} // short year would be 'YY'
        />
        <YAxis
          width={40}
          tick={{ fill: 'var(--color)', fontSize: '0.75rem' }}
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
                  <div className='px-2 py-1 border rounded text-sm' style={{
                    backgroundColor: 'var(--bg-color)',
                  }}>
                    {`${moment(new Date(payloadObj.date)).format('M/D/YY')} [${display}]`}
                  </div>
                );
              }
            }
          }
          wrapperStyle={{ outline: 'none' }}
        />
      </BarChart>
    </ResponsiveContainer>
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
                <div className='mb-1 py-1 px-2 tab rounded'>
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
                <div className='mb-1 py-1 px-2 tab rounded'>
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
