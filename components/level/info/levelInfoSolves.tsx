import { Tab } from '@headlessui/react';
import FormattedDate from '@root/components/formattedDate';
import FormattedUser from '@root/components/formattedUser';
import { RoleIcon } from '@root/components/roleIcons';
import StyledTooltip from '@root/components/styledTooltip';
import Dimensions from '@root/constants/dimensions';
import Role from '@root/constants/role';
import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import classNames from 'classnames';
import Link from 'next/link';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ProStatsLevelType from '../../../constants/proStatsLevelType';
import { CountAndSum, LevelContext, ProStatsCommunityStepData } from '../../../contexts/levelContext';

export default function LevelInfoSolves() {
  const [disabled, setDisabled] = useState(false);
  const levelContext = useContext(LevelContext);
  const [proStatsLevel, setProStatsLevel] = useState(levelContext?.proStatsLevel);
  const { user } = useContext(AppContext);

  useEffect(() => {
    setProStatsLevel(levelContext?.proStatsLevel);
  }, [levelContext?.proStatsLevel]);

  function getSolvesBySteps(skip: number, steps: number) {
    setDisabled(true);

    toast.dismiss();
    toast.loading('Loading solves...');

    fetch(`/api/level/${levelContext?.level._id}/prostats/solves?skip=${skip}&steps=${steps}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async(res) => {
      if (res.status !== 200) {
        throw res.text();
      } else {
        const resp = await res.json();

        setProStatsLevel(p => {
          if (!p || !p[ProStatsLevelType.CommunityStepData]) {
            return p;
          }

          const newP = JSON.parse(JSON.stringify(p));

          for (let i = 0; i < newP[ProStatsLevelType.CommunityStepData].length; i++) {
            const stepData = newP[ProStatsLevelType.CommunityStepData][i];

            if (stepData.moves === steps) {
              stepData.users = stepData.users.concat(resp);

              break;
            }
          }

          return newP;
        });

        toast.dismiss();
        toast.success('Loaded solves');
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Error saving comment');
    }).finally(() => {
      setDisabled(false);
    });
  }

  if (!proStatsLevel || !proStatsLevel[ProStatsLevelType.CommunityStepData] || (proStatsLevel[ProStatsLevelType.CommunityStepData] as ProStatsCommunityStepData[]).length === 0) {
    return <div className='text-sm'>No solve data available.</div>;
  }

  const solveDivs = [];

  for (let i = 0; i < (proStatsLevel[ProStatsLevelType.CommunityStepData] as ProStatsCommunityStepData[]).length; i++) {
    const solve = (proStatsLevel[ProStatsLevelType.CommunityStepData] as ProStatsCommunityStepData[])[i];

    // green bar fill for the users that completed the level
    if (i === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (solve as any).fill = 'rgb(21 128 61)';
    }

    for (let j = 0; j < solve.users.length; j++) {
      const userAndStatTs = solve.users[j];

      solveDivs.push(
        <div
          className='flex gap-2 items-center'
          key={`solve-${solve.moves}-${j}`}
        >
          <span
            className='font-bold w-11 text-right'
            data-tooltip-content={`${solve.count} user${solve.count === 1 ? '' : 's'} at ${solve.moves} step${solve.moves === 1 ? '' : 's'}`}
            data-tooltip-id='steps'
            style={{
              minWidth: 44,
            }}
          >
            {j === 0 ? solve.moves : null}
          </span>
          <StyledTooltip id='steps' />
          <FormattedUser size={Dimensions.AvatarSizeSmall} user={userAndStatTs.user} />
          <FormattedDate ts={userAndStatTs.statTs} />
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
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1} stroke='currentColor' className='w-7 h-7'>
            <path strokeLinecap='round' strokeLinejoin='round' d='M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z' />
          </svg>
          <button className='text-sm italic underline' disabled={disabled} onClick={() => getSolvesBySteps(solve.users.length, solve.moves)}>
            {`and ${solve.count - solve.users.length} other${solve.count - solve.users.length === 1 ? '' : 's'}`}
          </button>
        </div>
      );
    }
  }

  return (
    <div className='flex flex-col gap-2'>
      {!isPro(user) &&
        <div className='flex gap-3 items-center'>
          <RoleIcon role={Role.PRO} size={20} />
          <div>
            Get <Link href='/settings/proaccount' className='text-blue-300'>
              Pathology Pro
            </Link> to see all solves for this level.
          </div>
        </div>
      }
      <Tab.Group>
        {isPro(user) &&
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
        }
        <Tab.Panels>
          <Tab.Panel tabIndex={-1}>
            {solveDivs}
          </Tab.Panel>
          <Tab.Panel tabIndex={-1}>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart
                data={proStatsLevel[ProStatsLevelType.CommunityStepData]}
                margin={{ top: 8, right: 8, left: -16 }}
                maxBarSize={30}
              >
                <Bar dataKey='count' fill='var(--bg-color-4)' />
                <CartesianGrid
                  stroke='var(--bg-color-4)'
                  strokeDasharray='1 4'
                  vertical={false}
                />
                <XAxis
                  angle={-45}
                  dataKey='moves'
                  interval={0}
                  tick={{ fill: 'var(--color)', fontSize: '0.75rem' }}
                  tickMargin={8}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'var(--color)', fontSize: '0.75rem' }}
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
                          <div className='px-2 py-1 border rounded text-sm' style={{
                            backgroundColor: 'var(--bg-color)',
                          }}>
                            {`${display} user${display === 1 ? '' : 's'} at ${payloadObj.moves} step${payloadObj.moves === 1 ? '' : 's'}`}
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
