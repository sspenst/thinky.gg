import { Tab } from '@headlessui/react';
import { RoleIcon } from '@root/components/page/roleIcons';
import StyledTooltip from '@root/components/page/styledTooltip';
import Role from '@root/constants/role';
import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import classNames from 'classnames';
import moment from 'moment';
import Link from 'next/link';
import React, { Fragment, useContext } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ProStatsLevelType from '../../../constants/proStatsLevelType';
import { CountAndSum, DateAndSum, LevelContext } from '../../../contexts/levelContext';

function getTimePlayedStr(sum: number, short = false) {
  const duration = moment.duration(sum, 'seconds');

  if (duration.asSeconds() < 60) {
    const seconds = duration.seconds();

    return `${seconds}${short ? 's' : ` second${seconds === 1 ? '' : 's'}`}`;
  }

  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const hoursStr = `${hours}${short ? 'h' : ` hour${hours === 1 ? '' : 's'}`}`;
  const minutesStr = `${minutes}${short ? 'm' : ` minute${minutes === 1 ? '' : 's'}`}`;

  return hours === 0 ? minutesStr : `${hoursStr} ${minutesStr}`;
}

export default function LevelInfoPlayTime() {
  const levelContext = useContext(LevelContext);
  const proStatsLevel = levelContext?.proStatsLevel;
  const { user } = useContext(AppContext);

  if (!isPro(user)) {
    return (
      <div className='flex gap-3 items-center'>
        <RoleIcon id='level-info-play-time' role={Role.PRO} size={20} />
        <div>
          Get <Link href='/settings/pro' className='text-blue-300'>
            Pathology Pro
          </Link> to see your play time for this level.
        </div>
      </div>
    );
  }

  if (!proStatsLevel || !proStatsLevel[ProStatsLevelType.PlayAttemptsOverTime]) {
    return <div className='text-sm'>No play time data available.</div>;
  }

  const total = (proStatsLevel[ProStatsLevelType.PlayAttemptsOverTime] as DateAndSum[]).reduce((a, b) => a + b.sum, 0);

  return (
    <div className='flex flex-col gap-2'>
      <Tab.Group>
        <Tab.List className='flex flex-wrap gap-x-1 items-start rounded text-sm' >
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
            <div className='grid gap-x-4 gap-y-1 pl-1' style={{
              gridTemplateColumns: 'min-content 1fr',
            }}>
              {
                (proStatsLevel[ProStatsLevelType.PlayAttemptsOverTime] as DateAndSum[]).map((d, i) => {
                  return [
                    <div className='w-full justify-end flex items-center' key={`prostat-playattemptgraph-${i}-1`}>{moment(new Date(d.date)).utc().format('M/D/YY')}</div>,
                    <div className='text-left text-sm flex items-center' key={`prostat-playattemptgraph-${i}-2`} style={{
                      color: 'var(--color-gray)',
                    }}>{getTimePlayedStr(d.sum)}</div>,
                  ];
                })
              }
              <div className='w-full justify-end flex items-center font-bold'>Total</div>
              <div className={classNames('text-left flex items-center', { 'font-bold': total })}>{total === 0 ? 'No play time recorded' : getTimePlayedStr(total)}</div>
              {proStatsLevel[ProStatsLevelType.CommunityPlayAttemptsData] && (proStatsLevel[ProStatsLevelType.CommunityPlayAttemptsData] as CountAndSum).count >= 1 && (<>
                <div
                  className='w-20 w-full justify-end flex items-center font-medium underline decoration-dashed cursor-help'
                  data-tooltip-content='Average time for others who solved this level'
                  data-tooltip-id='others-tooltip'
                >
                  Others
                </div>
                <div className='text-left flex items-center font-medium'>{getTimePlayedStr(((proStatsLevel[ProStatsLevelType.CommunityPlayAttemptsData] as CountAndSum)?.sum / (proStatsLevel[ProStatsLevelType.CommunityPlayAttemptsData] as CountAndSum)?.count) || 0)}</div>
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
