import Dimensions from '@root/constants/dimensions';
import StatFilter from '@root/constants/statFilter';
import TourPath from '@root/constants/tourPath';
import isFullAccount from '@root/helpers/isFullAccount';
import isGuest from '@root/helpers/isGuest';
import Image from 'next/image';
import Link from 'next/link';
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
import SelectCard from '../cards/selectCard';
import FormattedReview from '../level/reviews/formattedReview';
import LoadingSpinner from '../page/loadingSpinner';
import RecommendedLevel from './recommendedLevel';

interface HomeProps {
  lastLevelPlayed?: EnrichedLevel | null;
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
  const { game, userConfig } = useContext(AppContext);
  const tour = useTour(TourPath.HOME);

  return (<>
    {tour}
    {user && !isFullAccount(user) &&
      <div className='bg-yellow-200 w-full text-black text-center text-sm p-2 shadow-lg'>
        {`${isGuest(user) ? 'Convert to a regular account' : 'Confirm your email'} in your `}
        <Link className='font-semibold text-blue-600 hover:underline' href='/settings/account'>
          Account Settings
        </Link>
        {' to unlock all basic features!'}
      </div>
    }
    <div className='flex flex-col items-center gap-6 m-6'>
      <div className='flex flex-wrap justify-center items-center gap-4 max-w-full'>
        {userConfig !== undefined && !userConfig?.tutorialCompletedAt &&
          <Card id='tutorial' title='Tutorial'>
            <SelectCard option={{
              height: Dimensions.OptionHeightLarge,
              href: '/tutorial',
              id: 'tutorial',
              text: <span className='text-3xl font-bold'>Start</span>,
            }} />
          </Card>
        }
        {!game.disableCampaign && user &&
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
      <div className='w-full max-w-screen-2xl pt-4 flex flex-col gap-2'>
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
      <div className='flex flex-col 2xl:flex-row justify-center max-w-screen-2xl'>
        <div className='grow w-full px-4 h-min flex flex-col gap-2' id='latestLevelsSection'>
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
        <div id='latest-reviews' className=''>
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
      </div>
    </div>
  </>);
}
