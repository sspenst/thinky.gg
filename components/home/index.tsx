import StatFilter from '@root/constants/statFilter';
import TourPath from '@root/constants/tourPath';
import getProfileSlug from '@root/helpers/getProfileSlug';
import { ScreenSize } from '@root/hooks/useDeviceCheck';
import classNames from 'classnames';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useState } from 'react';
import TimeRange from '../../constants/timeRange';
import { AppContext } from '../../contexts/appContext';
import useTour from '../../hooks/useTour';
import { EnrichedLevel } from '../../models/db/level';
import Review from '../../models/db/review';
import User from '../../models/db/user';
import Card from '../cards/card';
import ChapterSelectCard from '../cards/chapterSelectCard';
import LevelCard from '../cards/levelCard';
import LevelCardWithTitle from '../cards/levelCardWithTitle';
import LoadingCard from '../cards/loadingCard';
import FormattedReview from '../level/reviews/formattedReview';
import LoadingSpinner from '../page/loadingSpinner';
import MultiSelectUser from '../page/multiSelectUser';
import UpsellFullAccount from './upsellFullAccount';

interface HomeProps {
  lastLevelPlayed?: EnrichedLevel;
  latestLevels?: EnrichedLevel[];
  latestReviews?: Review[];
  levelOfDay?: EnrichedLevel | null;
  recommendedLevel?: EnrichedLevel | null;
  topLevelsThisMonth?: EnrichedLevel[];
  user: User | null;
}

export default function Home({
  lastLevelPlayed,
  latestLevels,
  latestReviews,
  levelOfDay,
  recommendedLevel,
  topLevelsThisMonth,
  user,
}: HomeProps) {
  const { deviceInfo, game, userConfig, multiplayerSocket } = useContext(AppContext);
  const router = useRouter();
  const [search, setSearch] = useState('');
  const tour = useTour(TourPath.HOME);

  function getSuggestedAction() {
    if (userConfig === undefined) {
      return null;
    }

    // suggest the tutorial if it hasn't been completed
    if (!userConfig?.tutorialCompletedAt) {
      if (game.disableTutorial) {
        return null;
      }

      return (
        <Card id='campaign' title={game.displayName + ' Tutorial'}>
          <ChapterSelectCard chapter={0} />
        </Card>
      );
    }

    // next suggest the next campaign chapter
    if (game.disableCampaign) {
      return null;
    }

    return (
      <Card id='campaign' title={game.displayName + ' Official Campaign'}>
        <ChapterSelectCard chapter={userConfig?.chapterUnlocked ?? 1} href='/play' />
      </Card>
    );
  }

  const buttonClassNames = 'px-3 py-2.5 inline-flex justify-center items-center gap-2 rounded-lg border font-medium align-middle focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm whitespace-nowrap bg-green-100 dark:bg-gray-800 hover:bg-gray-50 hover:dark:bg-slate-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300';
  const { connectedPlayersCount, matches, socket } = multiplayerSocket;

  const buttonsSection = (
    <div className='flex flex-col gap-2 w-fit'>
      {!game.disableRanked && <Link passHref href='/ranked' className={buttonClassNames}>
        <span className='w-5 h-5 flex justify-center items-center text-xl'>🏅</span>
        <span className='text-lg font-bold'>Ranked</span>
      </Link>}
      {!game.disableMultiplayer &&
        <Link passHref href='/multiplayer' className={buttonClassNames}>
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
            <path strokeLinecap='round' strokeLinejoin='round' d='M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' />
          </svg>
          <div className='flex flex-col'>
            <span className='text-lg font-bold'>Multiplayer</span>
            {!socket?.connected ?
              <span className='text-xs text-yellow-500'>Connecting...</span>
              :
              <>
                <span className='text-xs text-green-500'>{`${connectedPlayersCount} player${connectedPlayersCount !== 1 ? 's' : ''} online`}</span>
                {matches.length > 0 &&
                  <span className='text-xs text-green-300'>
                    {`${matches.length} current match${matches.length === 1 ? '' : 'es'}`}
                  </span>
                }
              </>
            }
          </div>
        </Link>
      }
      <Link passHref href='/create' className={buttonClassNames}>
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='2 2 20 20' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
        </svg>
        <span className='text-lg font-bold'>Create Level</span>
      </Link>
    </div>
  );

  const buttonsSections2 = (
    <div className='flex justify-center'>
      <div className='gap-x-4 gap-y-2 flex flex-wrap flex-col md:flex-row justify-center'>
        <Link id='usersBtn' passHref href='/users' className={buttonClassNames}>
          <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-list-ol' viewBox='0 0 16 16'>
            <path fillRule='evenodd' d='M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z' />
            <path d='M1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.361-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588-.002.954.291.957.703a.595.595 0 0 1-.492.594v.033a.615.615 0 0 1 .569.631c.003.533-.502.8-1.051.8-.656 0-1-.37-1.008-.794h.582c.008.178.186.306.422.309.254 0 .424-.145.422-.35-.002-.195-.155-.348-.414-.348h-.3zm-.004-4.699h-.604v-.035c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054V9H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338v.041zM2.564 5h-.635V2.924h-.031l-.598.42v-.567l.629-.443h.635V5z' />
          </svg>Users
        </Link>
        {!game.disableCommunityCampaigns && <Link id='communityCampaignsBtn' passHref href='/campaigns' className={buttonClassNames}>
          <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-book' viewBox='0 0 16 16'>
            <path d='M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z' />
          </svg>Community Campaigns
        </Link>
        }
        <Link passHref href='/leaderboards' className={buttonClassNames}>
          <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-trophy' viewBox='0 0 16 16'>
            <path d='M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5c0 .538-.012 1.05-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33.076 33.076 0 0 1 2.5.5zm.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935zm10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935zM3.504 1c.007.517.026 1.006.056 1.469.13 2.028.457 3.546.87 4.667C5.294 9.48 6.484 10 7 10a.5.5 0 0 1 .5.5v2.61a1 1 0 0 1-.757.97l-1.426.356a.5.5 0 0 0-.179.085L4.5 15h7l-.638-.479a.501.501 0 0 0-.18-.085l-1.425-.356a1 1 0 0 1-.757-.97V10.5A.5.5 0 0 1 9 10c.516 0 1.706-.52 2.57-2.864.413-1.12.74-2.64.87-4.667.03-.463.049-.952.056-1.469H3.504z' />
          </svg>Leaderboards
        </Link>
        <Link passHref href='/tutorial' className={buttonClassNames}>
          <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={1}>
            <path d='M12 14l9-5-9-5-9 5 9 5z' />
            <path d='M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' />
            <path strokeLinecap='round' strokeLinejoin='round' d='M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222' />
          </svg>Tutorial
        </Link>
      </div>
    </div>
  );

  return (<>
    {tour}
    <UpsellFullAccount user={user} />
    <div className='flex justify-center m-6 text-center'>
      <div className='flex flex-col items-center gap-8 w-full max-w-screen-2xl'>
        <div className='flex flex-wrap justify-center gap-8 items-center max-w-full'>
          {getSuggestedAction()}
          {user && buttonsSection}
        </div>
        <div className='flex flex-wrap justify-center gap-6 max-w-full'>
          <LevelCardWithTitle
            id='level-of-day'
            level={levelOfDay}
            title='Level of the Day'
            tooltip={'Every day there is a new level of the day. Difficulty increases throughout the week!'}
          />
          <LevelCardWithTitle
            id='recommended-level'
            level={recommendedLevel}
            title='Try this Level'
            tooltip={'This is a quality level with similar difficulty to levels you\'ve played recently.'}
          />
          {user && <LevelCardWithTitle
            id='last-level-played'
            level={lastLevelPlayed}
            title={
              <div className='flex items-center gap-2'>
                <Link className='font-bold hover:underline' href='/play-history'>
                  Last Played
                </Link>
                <Link href='/pro' passHref>
                  <Image alt='pro' src='/pro.svg' width={16} height={16} style={{ minWidth: 16, minHeight: 16 }} />
                </Link>
              </div>
            }
            tooltip='Resume your last play. Click to see your play history.'
          />}
        </div>
        {buttonsSections2}
        <div className='flex items-center justify-center'>
          <div className='flex flex-col'>
            <div className='flex items-center'>
              <form action='/search'>
                <input type='hidden' name='timeRange' value='All' />
                <input onChange={e => setSearch(e.target.value)} id='search' type='search' name='search' className='form-control relative flex-auto min-w-0 block w-52 px-2.5 py-1.5 h-10 text-base font-normal border border-solid border-color-4 rounded-md rounded-r-none rounded-b-none transition ease-in-out m-0 focus:border-blue-600 focus:outline-none' placeholder='Search levels...' aria-label='Search' aria-describedby='button-addon2' />
              </form>
            </div>
            <div>
              <MultiSelectUser
                controlStyles={{
                  borderBottomLeftRadius: '0.375rem',
                  borderBottomRightRadius: '0rem',
                  borderTopLeftRadius: '0rem',
                  borderTopRightRadius: '0rem',
                }}
                onSelect={(selectedItem: User) => {
                  router.push(
                    {
                      pathname: getProfileSlug(selectedItem),
                    }
                  );
                }}
              />
            </div>
          </div>
          <Link
            className={classNames(buttonClassNames, 'py-1.5 h-20 mr-0 rounded-l-none cursor-pointer')}
            href={{
              pathname: '/search',
              query: {
                ...(search ? { search: search } : {})
              },
            }}
            passHref
          >
            <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' fill='none' viewBox='0 0 24 24'
              stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2'
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
            </svg>
          </Link>
        </div>
        <div className={classNames(
          'w-full flex flex-col gap-4',
          deviceInfo.screenSize >= ScreenSize['3XL'] ? 'max-w-full' : 'max-w-screen-lg',
        )}>
          <div id='top-levels-of-month' className='flex justify-center'>
            <Link
              className='font-bold text-xl text-center hover:underline'
              href={{
                pathname: '/search',
                query: {
                  sortBy: 'reviewScore',
                  timeRange: TimeRange[TimeRange.Month],
                },
              }}
            >
              Top Levels this Month
            </Link>
          </div>
          <div className='flex flex-wrap justify-center gap-4'>
            {topLevelsThisMonth ?
              topLevelsThisMonth.length === 0 ?
                <div className='text-center italic p-3'>No levels found</div>
                :
                topLevelsThisMonth.map((level) => {
                  return (
                    <LevelCard
                      id='top-level-this-month'
                      key={level._id.toString()}
                      level={level}
                    />
                  );
                })
              :
              <>
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
              </>
            }
          </div>
        </div>
        <div className='flex flex-col lg:flex-row items-center lg:items-start gap-8 w-full'>
          <div className='lg:w-7/12 h-min flex flex-col gap-4 max-w-full' id='latestLevelsSection'>
            <div id='latest-levels' className='flex justify-center'>
              <Link
                className='font-bold text-xl text-center hover:underline'
                href={{
                  pathname: '/search',
                  query: {
                    sortBy: 'ts',
                    statFilter: StatFilter.HideSolved,
                    timeRange: TimeRange[TimeRange.All],
                  },
                }}
              >
                Latest Unsolved Levels
              </Link>
            </div>
            <div className='flex flex-wrap justify-center gap-4'>
              {latestLevels ?
                latestLevels.length === 0 ?
                  <div className='text-center italic p-3'>No levels found</div>
                  :
                  latestLevels.map((level) => {
                    return (
                      <LevelCard
                        id='latest-unsolved'
                        key={level._id.toString()}
                        level={level}
                      />
                    );
                  })
                :
                <>
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                </>
              }
            </div>
          </div>
          <div id='latest-reviews' className='flex flex-col gap-4 lg:w-5/12 px-4 max-w-full'>
            <h2 className='font-bold text-xl text-center'>
              Latest Reviews
            </h2>
            <div className='w-full text-center flex flex-col gap-4'>
              {latestReviews === undefined ?
                <div className='flex justify-center p-4'>
                  <LoadingSpinner />
                </div>
                :
                latestReviews.length === 0 ?
                  <div className='text-center italic p-3'>No reviews found</div>
                  :
                  latestReviews.map(review => {
                    return (
                      <div key={`review-${review._id.toString()}`}>
                        <FormattedReview
                          level={review.levelId}
                          review={review}
                          user={review.userId}
                        />
                      </div>
                    );
                  })
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  </>);
}
