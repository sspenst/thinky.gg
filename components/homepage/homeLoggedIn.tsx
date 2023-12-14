import StatFilter from '@root/constants/statFilter';
import TourPath from '@root/constants/tourPath';
import getProfileSlug from '@root/helpers/getProfileSlug';
import isFullAccount from '@root/helpers/isFullAccount';
import isGuest from '@root/helpers/isGuest';
import classNames from 'classnames';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext } from 'react';
import TimeRange from '../../constants/timeRange';
import { AppContext } from '../../contexts/appContext';
import useTour from '../../hooks/useTour';
import { EnrichedLevel } from '../../models/db/level';
import Review from '../../models/db/review';
import User from '../../models/db/user';
import Card from '../cards/card';
import ChapterSelectCard from '../cards/chapterSelectCard';
import LevelSelect from '../cards/levelSelect';
import LoadingCard from '../cards/loadingCard';
import FormattedReview from '../level/reviews/formattedReview';
import LoadingSpinner from '../page/loadingSpinner';
import MultiSelectLevel from '../page/multiSelectLevel';
import MultiSelectUser from '../page/multiSelectUser';
import RecommendedLevel from './recommendedLevel';

interface HomeLoggedInProps {
  lastLevelPlayed?: EnrichedLevel | null;
  latestLevels?: EnrichedLevel[];
  latestReviews?: Review[];
  levelOfDay?: EnrichedLevel | null;
  recommendedLevel?: EnrichedLevel | null;
  topLevelsThisMonth?: EnrichedLevel[];
  user: User;
}

export default function HomeLoggedIn({
  lastLevelPlayed,
  latestLevels,
  latestReviews,
  levelOfDay,
  recommendedLevel,
  topLevelsThisMonth,
  user,
}: HomeLoggedInProps) {
  const { game } = useContext(AppContext);
  const router = useRouter();
  const tour = useTour(TourPath.HOME);

  const buttonClassNames = 'py-2.5 px-3.5 inline-flex justify-center items-center gap-2 rounded-md border font-medium align-middle focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm whitespace-nowrap bg-green-100 dark:bg-slate-800 hover:bg-gray-50 hover:dark:bg-slate-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300';

  return (<>
    {tour}
    {!isFullAccount(user) &&
      <div className='bg-yellow-200 w-full text-black text-center text-sm p-2 shadow-lg'>
        {`${isGuest(user) ? 'Convert to a regular account' : 'Confirm your email'} in your `}
        <Link className='font-semibold text-blue-600 hover:underline' href='/settings/account'>
          Account Settings
        </Link>
        {' to unlock all basic features!'}
      </div>
    }
    <div className='flex flex-col gap-6 m-6'>
      <div className='flex items-center justify-center gap-2'>
        <MultiSelectLevel
          onSelect={(selectedItem: EnrichedLevel) => {
            router.push(`/level/${selectedItem.slug}`);
          }}
        />
        <MultiSelectUser
          onSelect={(selectedItem: User) => {
            router.push(getProfileSlug(selectedItem));
          }}
        />
        <Link
          className={classNames(buttonClassNames, 'py-1.5 h-10 cursor-pointer')}
          href={{
            pathname: '/search',
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
      <div className='flex flex-wrap justify-center gap-4'>
        {!game.disableCampaign &&
          <Card id='campaign' title={game.displayName + ' Official Campaign'}>
            <div className='p-3'>
              <ChapterSelectCard chapter={user.config?.chapterUnlocked ?? 1} href='/play' />
            </div>
          </Card>
        }
        <RecommendedLevel
          id='level-of-day'
          level={levelOfDay}
          title='Level of the Day'
          tooltip={'Every day there is a new level of the day. Difficulty increases throughout the week!'}
        />
        <RecommendedLevel
          id='recommended-level'
          level={recommendedLevel}
          title='Try this Level'
          tooltip={'This is a quality level with similar difficulty to levels you\'ve played recently.'}
        />
        <RecommendedLevel
          id='last-level-played'
          level={lastLevelPlayed}
          title={
            <div className='flex items-center gap-2'>
              <Link className='font-bold hover:underline' href='/play-history'>
              Last Played
              </Link>
              <Link href='/settings/pro' passHref>
                <Image alt='pro' src='/pro.svg' width={16} height={16} style={{ minWidth: 16, minHeight: 16 }} />
              </Link>
            </div>
          }
          tooltip='Resume your last play. Click to see your play history.'
        />
      </div>
      <div className='w-full pt-4'>
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
            Top Levels this Month:
          </Link>
        </div>
        {topLevelsThisMonth ?
          <LevelSelect levels={topLevelsThisMonth} /> :
          <div className='flex flex-wrap justify-center'>
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>
        }
      </div>
      <div className='flex flex-wrap justify-center max-w-screen-2xl mx-auto'>
        <div className='w-full md:w-1/2 px-4 h-min' id='latestLevelsSection'>
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
            Latest Unsolved Levels:
            </Link>
          </div>
          {latestLevels ? <LevelSelect levels={latestLevels} /> :
            <div className='flex flex-wrap justify-center'>
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
            </div>
          }
        </div>
        <div id='latest-reviews' className='w-full md:w-1/2'>
          <h2 className='font-bold text-xl text-center'>Latest Reviews:</h2>
          <div className='text-center'>
            {latestReviews === undefined ?
              <div className='flex justify-center p-4'><LoadingSpinner /></div>
              :
              latestReviews.length === 0 ?
                <div className='text-center italic p-3'>
                No reviews found
                </div>
                :
                latestReviews.map(review => {
                  return (
                    <div
                      className='mx-4 md:mx-8 my-4'
                      key={`review-${review._id.toString()}`}
                    >
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
        <iframe
          className='p-4'
          height='640'
          id='discordSection'
          sandbox='allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts'
          src='https://discord.com/widget?id=971585343956590623&theme=dark'
          width='640'
        />
      </div>
    </div>
  </>);
}
