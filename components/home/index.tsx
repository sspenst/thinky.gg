import StatFilter from '@root/constants/statFilter';
import TourPath from '@root/constants/tourPath';
import getProfileSlug from '@root/helpers/getProfileSlug';
import classNames from 'classnames';
import { ChevronsDown, ChevronsUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
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
import QuickActionButton from '../quickActionButton';
import StreakSection from '../streak/streakSection';
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
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };

    window.addEventListener('scroll', onScroll);

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const buttonsSection = user && (
    <div className='flex flex-col gap-4 w-full'>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
        <QuickActionButton
          href='/search'
          icon='🔍'
          text='Browse Levels'
        />
        <QuickActionButton
          href='/create'
          icon='🎨'
          text='Create'
        />
        {!game.disableRanked && <QuickActionButton
          href='/ranked'
          icon='🏆'
          text='Ranked'
        />}
        {!game.disableMultiplayer && <QuickActionButton
          href='/multiplayer'
          icon='👥'
          text='Multiplayer'
          subtitle={!socket?.connected ? 'Connecting...' : `${connectedPlayersCount} player${connectedPlayersCount !== 1 ? 's' : ''} online${matches.length > 0 ? ` • ${matches.length} current match${matches.length === 1 ? '' : 'es'}` : ''}`}
        />}
        {!game.disableCommunityCampaigns && <QuickActionButton
          href='/campaigns'
          icon='📚'
          text='Community Campaigns'
        />}
        <QuickActionButton
          href='/leaderboards'
          icon='🏆'
          text='Leaderboards'
        />
        <QuickActionButton
          href='/play-history'
          icon='📜'
          text='Play History'
        />
        <QuickActionButton
          href='/tutorial'
          icon='🎓'
          text='Tutorial'
        />
      </div>

    </div>
  );

  const latestLevelsSection = <div className='lg:w-8/12 h-min flex flex-col gap-4 max-w-full'>
    <div className='rounded-xl overflow-hidden transition-all duration-300'>
      <div className='bg-gradient-to-r from-purple-600 to-blue-600 p-2 text-white'>
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
      </div>
      <div className='bg-white dark:bg-gray-800 p-4'>
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
    </div>
  </div>;

  const topLevelsThisMonthSection =
    <div className='rounded-xl overflow-hidden transition-all duration-300 flex flex-col gap-4 w-full px-0'>
      <div className='bg-gradient-to-r from-purple-600 to-blue-600 p-2 text-white'>
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
      </div>
      <div className='bg-white dark:bg-gray-800 p-4'>
        <div className='flex flex-col justify-center gap-4 items-center'>
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
    </div>;

  const latestReviewSection = <div id='latest-reviews' className='flex flex-col gap-4 w-full px-0'>
    <div className='rounded-xl overflow-hidden transition-all duration-300'>
      <div className='bg-gradient-to-r from-purple-600 to-blue-600 p-2 text-white'>
        <h2 className='font-bold text-xl text-center'>
          Latest Reviews
        </h2>
      </div>
      <div className='bg-white dark:bg-gray-800 p-4'>
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
  </div>;

  const searchSection = <div className='flex flex-col w-full'>
    <div>
      <div className='flex items-center'>
        <form className='w-full' action='/search'>
          <input type='hidden' name='timeRange' value='All' />
          <input onChange={e => setSearch(e.target.value)} id='search' type='search' name='search' className='rounded-r-none rounded-b-none w-full' placeholder='Search levels...' aria-label='Search' />
        </form>
      </div>
      <div>
        <MultiSelectUser
          controlStyles={{
            borderBottomLeftRadius: '0.25rem',
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
      className={classNames(buttonClassNames, 'py-1.5 h-full mr-0 rounded-l-none cursor-pointer')}
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
  </div>;
  const streakSection = userConfig && <div className='flex flex-col w-100 max-w-full justify-center items-center mx-auto'><StreakSection hideHeader gameId={game.id} userConfig={userConfig} compact /></div>;
  const scrollToSectionButtons = deviceInfo.isMobile && <div className='flex gap-2'>
    <button
      onClick={() => {
        const element = document.getElementById('latest-levels');

        if (element) {
          const y = element.getBoundingClientRect().top + window.scrollY - 80;

          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }}
      className='group px-4 py-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md'
    >
      <span>Latest Levels</span>
      <ChevronsDown />
    </button>
    <button
      onClick={() => {
        const element = document.getElementById('top-levels-of-month');

        if (element) {
          const y = element.getBoundingClientRect().top + window.scrollY - 80;

          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }}
      className='group px-4 py-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md'
    >
      <span>Top Levels</span>
      <ChevronsDown />
    </button>
  </div>;

  const scrollToTopButton = deviceInfo.isMobile && showScrollTop && (
    <button
      className='fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full p-3 shadow-lg lg:hidden transition hover:bg-gray-100 dark:hover:bg-gray-700'
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label='Scroll to top'
    >
      <ChevronsUp className='w-6 h-6 text-gray-700 dark:text-gray-200' />
    </button>
  );

  return (<>
    {tour}
    <UpsellFullAccount user={user} />
    {scrollToTopButton}
    <div className='flex justify-center m-6 text-center'>
      <div className='flex flex-col items-center gap-8 w-full max-w-screen-2xl'>
        <div className='flex flex-wrap justify-center gap-8 items-center max-w-full'>
          {getSuggestedAction()}
        </div>
        <div className='flex flex-wrap justify-center gap-4 items-center max-w-full'>
          {scrollToSectionButtons}
        </div>
        {streakSection}
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
              <div className='flex justify-center items-center gap-2'>
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
        <div className='flex items-center w-80 flex-col justify-center gap-2'>
          {searchSection}
        </div>
        <div className='w-full flex flex-col lg:flex-row gap-8 items-start'>
          {latestLevelsSection}
          <div className='flex flex-col gap-8 w-full lg:w-4/12'>
            {topLevelsThisMonthSection}
          </div>
        </div>
        {latestReviewSection}
        {buttonsSection}
      </div>
    </div>
  </>);
}
