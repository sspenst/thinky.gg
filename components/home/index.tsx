import StatFilter from '@root/constants/statFilter';
import TourPath from '@root/constants/tourPath';
import getProfileSlug from '@root/helpers/getProfileSlug';
import { Activity, ArrowRight, ChevronsDown, ChevronsUp, Search, Sparkles, Trophy } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
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
import GameLogo from '../gameLogo';
import FormattedReview from '../level/reviews/formattedReview';
import LoadingSpinner from '../page/loadingSpinner';
import MultiSelectUser from '../page/multiSelectUser';
import SpaceBackground from '../page/SpaceBackground';
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
  const [levelSearch, setLevelSearch] = useState('');
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

  const buttonClassNames = 'px-4 py-3 inline-flex justify-center items-center gap-2 rounded-xl font-medium align-middle focus:z-10 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm whitespace-nowrap bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20 text-white hover:scale-105 transform';
  const { connectedPlayersCount, matches, socket } = multiplayerSocket;

  const buttonsSection = user && (
    <div className='animate-fadeInUp flex flex-col gap-4 w-full' style={{ animationDelay: '1s' }}>
      <h2 className='text-2xl font-bold text-center mb-4'>
        <span className='bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent'>
          Quick Actions
        </span>
      </h2>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        <QuickActionButton
          href='/search'
          icon='🔍'
          text='Find Levels'
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

  const latestLevelsSection = <div className='lg:w-8/12 h-min flex flex-col gap-4 max-w-full animate-fadeInUp' style={{ animationDelay: '0.4s' }}>
    <div className='relative'>
      {/* Floating Island Effect */}
      <div className='absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-xl' />
      <div className='relative rounded-2xl overflow-hidden border border-white/20 backdrop-blur-sm bg-white/5'>
        <div className='bg-gradient-to-r from-purple-600/80 to-blue-600/80 p-4 backdrop-blur-md'>
          <div id='latest-levels' className='flex justify-center items-center gap-3'>
            <Sparkles className='w-6 h-6 text-yellow-300' />
            <Link
              className='font-bold text-2xl text-center text-white hover:text-yellow-300 transition-colors'
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
            <Sparkles className='w-6 h-6 text-yellow-300' />
          </div>
        </div>
        <div className='p-6'>
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
    </div>
  </div>;

  const topLevelsThisMonthSection =
    <div className='animate-fadeInRight flex flex-col gap-4 w-full px-0' style={{ animationDelay: '0.6s' }}>
      <div className='relative'>
        {/* Floating Island Effect */}
        <div className='absolute inset-0 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 blur-xl' />
        <div className='relative rounded-2xl overflow-hidden border border-white/20 backdrop-blur-sm bg-white/5'>
          <div className='bg-gradient-to-r from-yellow-600/80 to-orange-600/80 p-4 backdrop-blur-md'>
            <div id='top-levels-of-month' className='flex justify-center items-center gap-3'>
              <Trophy className='w-6 h-6 text-white' />
              <Link
                className='font-bold text-2xl text-center text-white hover:text-yellow-300 transition-colors'
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
              <Trophy className='w-6 h-6 text-white' />
            </div>
          </div>
          <div className='p-6'>
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
        </div>
      </div>
    </div>;

  const latestReviewSection = <div id='latest-reviews' className='animate-fadeInUp flex flex-col gap-4 w-full px-0' style={{ animationDelay: '0.8s' }}>
    <div className='relative'>
      {/* Floating Island Effect */}
      <div className='absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 blur-xl' />
      <div className='relative rounded-2xl overflow-hidden border border-white/20 backdrop-blur-sm bg-white/5'>
        <div className='bg-gradient-to-r from-cyan-600/80 to-blue-600/80 p-4 backdrop-blur-md'>
          <h2 className='font-bold text-2xl text-center text-white flex items-center justify-center gap-3'>
            <Activity className='w-6 h-6' />
            Latest Reviews
            <Activity className='w-6 h-6' />
          </h2>
        </div>
        <div className='p-6'>
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
  </div>;

  const searchSection = <div className='relative h-full z-50'>
    {/* Glassmorphism search container with MultiSelectUser */}
    <div className='bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 h-full flex flex-col'>
      <div className='flex items-center gap-3 mb-3'>
        <div className='p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg'>
          <Search className='w-5 h-5 text-white' />
        </div>
        <h3 className='text-lg font-bold text-white'>Search</h3>
      </div>
      <div className='flex-1 flex flex-col gap-3 justify-center'>
        <div className='w-full relative z-50'>
          <MultiSelectUser
            placeholder='🔍 Search for users...'
            onSelect={(selectedItem: User) => {
              if (selectedItem) {
                router.push(
                  {
                    pathname: getProfileSlug(selectedItem),
                  }
                );
              }
            }}
          />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push({
              pathname: '/search',
              query: {
                search: levelSearch,
                timeRange: TimeRange[TimeRange.All],
              }
            });
          }}
          className='w-full'
        >
          <div className='relative'>
            <input
              type='text'
              value={levelSearch}
              onChange={(e) => setLevelSearch(e.target.value)}
              placeholder='🎯 Search levels...'
              className='w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-200'
            />
            <button
              type='submit'
              className='absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-700/80 hover:to-pink-700/80 rounded-lg transition-all duration-200 hover:scale-105'
            >
              <ArrowRight className='w-4 h-4 text-white' />
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>;
  const streakSection = userConfig && (
    <div className='animate-fadeInUp flex flex-col w-100 max-w-full justify-center items-center mx-auto mb-8' style={{ animationDelay: '0.7s' }}>
      <StreakSection hideHeader gameId={game.id} userConfig={userConfig} compact />
    </div>
  );
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
      className='fixed bottom-6 right-6 z-50 bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-3 shadow-lg lg:hidden transition hover:bg-white/20 hover:scale-110 transform'
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label='Scroll to top'
    >
      <ChevronsUp className='w-6 h-6 text-white' />
    </button>
  );

  return (<>
    {tour}
    <UpsellFullAccount user={user} />
    {scrollToTopButton}
    <SpaceBackground
      constellationPattern='custom'
      customConstellations={[
        { left: '10%', top: '15%', size: '6px', color: 'bg-cyan-400', delay: '0s', duration: '3s', glow: true },
        { left: '25%', top: '20%', size: '5px', color: 'bg-purple-400', delay: '0.5s', duration: '2.5s', glow: true },
        { left: '40%', top: '10%', size: '7px', color: 'bg-pink-400', delay: '1s', duration: '3.5s', glow: true },
        { left: '70%', top: '25%', size: '6px', color: 'bg-yellow-400', delay: '1.5s', duration: '2.8s', glow: true },
        { left: '85%', top: '15%', size: '5px', color: 'bg-green-400', delay: '2s', duration: '3.2s', glow: true },
        { left: '55%', top: '30%', size: '6px', color: 'bg-blue-400', delay: '0.3s', duration: '2.9s', glow: true },
      ]}
      showGeometricShapes={true}
    >
      <div className='flex justify-center px-4 sm:px-6 py-12 text-center'>
        <div className='flex flex-col items-center gap-8 w-full max-w-screen-2xl'>
        {/* Hero Section */}
        <div className='animate-fadeInDown relative z-20 mb-12'>
          <h1 className='text-4xl sm:text-5xl lg:text-7xl font-black mb-4'>
            <span className='bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent'>
              Welcome to {game.displayName}
            </span>
          </h1>
          <p className='text-lg sm:text-xl text-gray-200 max-w-2xl mx-auto'>
            {game.shortDescription}
          </p>
        </div>
        
        <div className='flex flex-wrap justify-center gap-8 items-center max-w-full'>
          {getSuggestedAction()}
        </div>
        <div className='flex flex-wrap justify-center gap-4 items-center max-w-full'>
          {scrollToSectionButtons}
        </div>
        <div className='animate-fadeInUp flex flex-wrap justify-center gap-6 max-w-full' style={{ animationDelay: '0.5s' }}>
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
        <div className='animate-fadeInUp flex flex-col md:flex-row items-stretch w-full justify-center gap-6 max-w-4xl mx-auto relative z-50' style={{ animationDelay: '0.9s' }}>
          {userConfig && (
            <div className='flex-1 max-w-md'>
              <div className='bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 h-full'>
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg'>
                      <GameLogo gameId={game.id} id={game.id + '-streak-home'} size={20} />
                    </div>
                    <h3 className='text-lg font-bold text-white'>{game.displayName} Streak</h3>
                  </div>
                  <div className='bg-white/20 px-3 py-1 rounded-full text-sm font-medium text-white'>
                    {userConfig ? userConfig.calcCurrentStreak || 0 : 0} day{(userConfig?.calcCurrentStreak || 0) === 1 ? '' : 's'}
                  </div>
                </div>
                <StreakSection hideHeader gameId={game.id} userConfig={userConfig} compact />
              </div>
            </div>
          )}
          <div className='flex-1 max-w-md h-full'>
            {searchSection}
          </div>
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
    </SpaceBackground>
  </>);
}
