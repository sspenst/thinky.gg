import { Tab } from '@headlessui/react';
import { RoleIcon } from '@root/components/roleIcons';
import StyledTooltip from '@root/components/styledTooltip';
import Role from '@root/constants/role';
import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import classNames from 'classnames';
import moment from 'moment';
import Link from 'next/link';
import React, { Fragment, useContext } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ProStatsLevelType from '../../../constants/proStatsLevelType';
import { LevelContext } from '../../../contexts/levelContext';

function getTimePlayedStr(sum: number, short = false) {
  const duration = moment.duration(sum, 'seconds');

  if (duration.asSeconds() < 60) {
    // return seconds
    return `${duration.asSeconds().toFixed(0)}${short ? 's' : ` second${duration.asSeconds() === 1 ? '' : 's'}`}`;
  }

  if (duration.asMinutes() < 60) {
    // return minutes
    return `${duration.asMinutes().toFixed(0)}${short ? 'm' : ` minute${duration.asMinutes() === 1 ? '' : 's'}`}`;
  }

  if (duration.asHours() < 24) {
    // return hours and minutes
    const hours = duration.hours();
    const minutes = duration.minutes();
    const hoursStr = `${hours}${short ? 'h' : ` hour${hours === 1 ? '' : 's'}`}`;
    const minutesStr = `${minutes}${short ? 'm' : ` minute${minutes === 1 ? '' : 's'}`}`;

    return `${hoursStr} ${minutesStr}`;
  }

  // return days, hours, and minutes
  const days = duration.days();
  const hours = duration.hours();
  const minutes = duration.minutes();
  const daysStr = `${days}${short ? 'd' : ` day${days === 1 ? '' : 's'}`}`;
  const hoursStr = `${hours}${short ? 'h' : ` hour${hours === 1 ? '' : 's'}`}`;
  const minutesStr = `${minutes}${short ? 'm' : ` minute${minutes === 1 ? '' : 's'}`}`;

  return `${daysStr} ${hoursStr} ${minutesStr}`;
}

export default function LevelInfoPlayTime() {
  const levelContext = useContext(LevelContext);
  const proStatsLevel = levelContext?.proStatsLevel;
  const { user } = useContext(AppContext);

  if (!isPro(user)) {
    return (
      <div className='flex gap-3 items-center'>
        <RoleIcon role={Role.PRO} size={20} />
        <div>
          Get <Link href='/settings/proaccount' className='text-blue-300'>
            Pathology Pro
          </Link> to see your play time for this level.
        </div>
      </div>
    );
  }

  if (!proStatsLevel || !proStatsLevel[ProStatsLevelType.PlayAttemptsOverTime] || proStatsLevel[ProStatsLevelType.PlayAttemptsOverTime].length === 0) {
    return <div className='text-sm'>No play time data available.</div>;
  }

  return (
    <div className='flex flex-col gap-2'>
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
          <Tab.Panel tabIndex={-1}>
            <div className='flex flex-col gap-1'>
              {
                proStatsLevel[ProStatsLevelType.PlayAttemptsOverTime].map((d, i) => {
                  return (
                    <div key={'prostat-playattemptgraph-' + i} className='flex flex-row gap-4 items-center'>
                      <div className='w-20 text-right'>{moment(new Date(d.date)).format('M/D/YY')}</div>
                      <div className='w-1/2 text-left text-sm' style={{
                        color: 'var(--color-gray)',
                      }}>{getTimePlayedStr(d.sum)}</div>
                    </div>
                  );
                })
              }
              <div className='flex flex-row gap-4 items-center font-bold'>
                <div className='w-20 text-right'>Total</div>
                <div className='w-1/2 text-left'>{getTimePlayedStr(proStatsLevel[ProStatsLevelType.PlayAttemptsOverTime].reduce((a, b) => a + b.sum, 0))}</div>
              </div>
              {proStatsLevel[ProStatsLevelType.CommunityPlayAttemptsData] && proStatsLevel[ProStatsLevelType.CommunityPlayAttemptsData].count >= 1 && (<>
                <div className='flex flex-row gap-4 items-center font-medium'>
                  <div data-tooltip-id='others-tooltip' className='w-20 text-right underline decoration-dashed cursor-help' data-tooltip-content='Average time for others who solved this level'>Others</div>
                  <div className='w-1/2 text-left'>{getTimePlayedStr((proStatsLevel[ProStatsLevelType.CommunityPlayAttemptsData]?.sum / proStatsLevel[ProStatsLevelType.CommunityPlayAttemptsData]?.count) || 0)}</div>
                </div>
                <StyledTooltip id='others-tooltip' />
              </>)}
            </div>
          </Tab.Panel>
          <Tab.Panel tabIndex={-1}>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart
                data={proStatsLevel[ProStatsLevelType.PlayAttemptsOverTime]}
                margin={{ top: 8, right: 8, left: -16 }}
                maxBarSize={30}
              >
                <Bar dataKey='sum' fill='var(--bg-color-4)' />
                <CartesianGrid
                  stroke='var(--bg-color-4)'
                  strokeDasharray='1 4'
                  vertical={false}
                />
                <XAxis dataKey='date'
                  angle={-45}
                  interval={0}
                  tick={{ fill: 'var(--color)', fontSize: '0.75rem' }}
                  tickFormatter={(date) => moment(new Date(date)).format('M/D')}
                  tickMargin={8}
                />
                <YAxis
                  tick={{ fill: 'var(--color)', fontSize: '0.75rem',
                    style: { textAnchor: 'middle', }
                  }}
                  tickMargin={15}
                  tickFormatter={(sum) => getTimePlayedStr(sum, true)}
                  type='number'
                />
                <Tooltip
                  cursor={false}
                  content={
                    ({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const payloadObj = payload[0].payload;
                        const display = getTimePlayedStr(payloadObj.sum);

                        return (
                          <div className='px-2 py-1 border rounded text-sm' style={{
                            backgroundColor: 'var(--bg-color)',
                          }}>
                            {`${moment(new Date(payloadObj.date)).format('M/D/YY')} - ${display}`}
                          </div>
                        );
                      }
                    }
                  }
                  wrapperStyle={{ outline: 'none' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
