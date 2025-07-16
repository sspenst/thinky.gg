import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import FormattedDate from '@root/components/formatted/formattedDate';
import FormattedUser from '@root/components/formatted/formattedUser';
import LoadingSpinner from '@root/components/page/loadingSpinner';
import { RoleIcon } from '@root/components/page/roleIcons';
import StyledTooltip from '@root/components/page/styledTooltip';
import Dimensions from '@root/constants/dimensions';
import Role from '@root/constants/role';
import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import classNames from 'classnames';
import Link from 'next/link';
import { Fragment, useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ProStatsLevelType from '../../../constants/proStatsLevelType';
import { LevelContext, ProStatsCommunityStepData } from '../../../contexts/levelContext';

export default function LevelInfoCompletions() {
  const [disabled, setDisabled] = useState(false);
  const levelContext = useContext(LevelContext);
  const [proStatsLevel, setProStatsLevel] = useState(levelContext?.proStatsLevel);
  const { game, user } = useContext(AppContext);

  useEffect(() => {
    setProStatsLevel(levelContext?.proStatsLevel);
  }, [levelContext?.proStatsLevel]);

  function getCompletionsBySteps(skip: number, steps: number) {
    setDisabled(true);

    toast.dismiss();

    if (!isPro(user)) {
      toast.dismiss();
      toast.error('You must be a Pro to see all completions for this level.');

      return;
    }

    toast.loading('Loading completions...');
    fetch(`/api/level/${levelContext?.level._id}/prostats/completions?skip=${skip}&steps=${steps}`, {
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
        toast.success('Loaded completions');
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Error saving comment');
    }).finally(() => {
      setDisabled(false);
    });
  }

  if (!proStatsLevel) {
    return <LoadingSpinner />;
  }

  if (!proStatsLevel[ProStatsLevelType.CommunityStepData] || (proStatsLevel[ProStatsLevelType.CommunityStepData] as ProStatsCommunityStepData[]).length === 0) {
    return <div className='text-sm'>No completion data available.</div>;
  }

  const completionDivs = [];
  const solves = proStatsLevel[ProStatsLevelType.CommunityStepData][0].count;
  let completions = 0;

  for (let i = 0; i < (proStatsLevel[ProStatsLevelType.CommunityStepData] as ProStatsCommunityStepData[]).length; i++) {
    const completion = (proStatsLevel[ProStatsLevelType.CommunityStepData] as ProStatsCommunityStepData[])[i];

    completions += completion.count;

    // green bar fill for the users that completed the level
    if (i === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (completion as any).fill = 'rgb(21 128 61)';
    }

    for (let j = 0; j < completion.users.length; j++) {
      const userAndStatTs = completion.users[j];

      completionDivs.push(
        <div
          className='flex items-center'
          key={`completion-${completion.moves}-${j}-1`}
        >
          <span
            className='font-bold w-full text-right'
            data-tooltip-content={`${completion.count} user${completion.count === 1 ? '' : 's'} at ${completion.moves} step${completion.moves === 1 ? '' : 's'}`}
            data-tooltip-id='steps'
          >
            {j === 0 ? completion.moves : null}
          </span>
          <StyledTooltip id='steps' />
        </div>
      );

      completionDivs.push(
        <div
          className='flex gap-2 items-center truncate'
          key={`completion-${completion.moves}-${j}-2`}
        >
          <FormattedUser id='completion' size={Dimensions.AvatarSizeSmall} user={userAndStatTs.user} />
          <FormattedDate ts={userAndStatTs.statTs} />
        </div>
      );
    }

    if (completion.users.length < completion.count) {
      completionDivs.push(<span className='font-bold w-full text-right' key={`completion-${completion.moves}-others-1`} />);

      completionDivs.push(
        <div
          className='flex gap-2 items-center'
          key={`completion-${completion.moves}-others-2`}
        >
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1} stroke='currentColor' className='w-7 h-7'>
            <path strokeLinecap='round' strokeLinejoin='round' d='M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z' />
          </svg>
          <button className='text-sm italic underline' disabled={disabled} onClick={() => getCompletionsBySteps(completion.users.length, completion.moves)}>
            {`and ${completion.count - completion.users.length} other${completion.count - completion.users.length === 1 ? '' : 's'}`}
          </button>
        </div>
      );
    }
  }

  return (
    <TabGroup className='flex flex-col gap-2'>
      {isPro(user) && <>
        <TabList className='flex flex-wrap gap-x-1 items-start rounded text-sm'>
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
        </TabList>
      </>}
      <TabPanels>
        <TabPanel tabIndex={-1}>
          <div className='grid gap-x-2 pl-1' style={{
            gridTemplateColumns: 'min-content 1fr',
          }}>
            {completionDivs}
          </div>
          {isPro(user) &&
            <div className='flex flex-col text-sm mt-3 italic'>
              <span>{solves} solve{solves === 1 ? '' : 's'}</span>
              <span>{completions} completion{completions === 1 ? '' : 's'}</span>
            </div>
          }
        </TabPanel>
        <TabPanel tabIndex={-1}>
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
        </TabPanel>
      </TabPanels>
      {!isPro(user) &&
        <div className='flex gap-3 items-center'>
          <RoleIcon id='level-info-completions' role={Role.PRO} size={20} />
          <div>
            Get <Link href='/pro' className='text-blue-300'>
              {game.displayName} Pro
            </Link> to see all completions for this level.
          </div>
        </div>
      }
    </TabGroup>
  );
}
