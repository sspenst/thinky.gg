import classNames from 'classnames';
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { SWRConfig } from 'swr';
import HomeDefault from '../components/homeDefault';
import HomeLoggedIn from '../components/homeLoggedIn';
import LevelButtonDisplay from '../components/LevelButtonDisplay';
import Page from '../components/page';
import SelectCard from '../components/selectCard';
import Dimensions from '../constants/dimensions';
import getPngDataClient from '../helpers/getPngDataClient';
import getSWRKey from '../helpers/getSWRKey';
import useLevelOfDay from '../hooks/useLevelOfDay';
import useUser from '../hooks/useUser';
import useUserConfig from '../hooks/useUserConfig';
import dbConnect from '../lib/dbConnect';
import Level, { EnrichedLevel } from '../models/db/level';
import Review from '../models/db/review';
import SelectOption from '../models/selectOption';
import SelectOptionStats from '../models/selectOptionStats';
import { getLatestLevels } from './api/latest-levels';
import { getLatestReviews } from './api/latest-reviews';
import { getLevelOfDay } from './api/level-of-day';

export async function getStaticProps() {
  // NB: connect early to avoid parallel connections below
  await dbConnect();

  const [levelOfDay, levels, reviews] = await Promise.all([
    getLevelOfDay(),
    getLatestLevels(),
    getLatestReviews(),
  ]);

  return {
    props: {
      levelOfDay: JSON.parse(JSON.stringify(levelOfDay)),
      levels: JSON.parse(JSON.stringify(levels)),
      reviews: JSON.parse(JSON.stringify(reviews)),
    } as AppSWRProps,
    revalidate: 60 * 60,
  };
}

interface AppSWRProps {
  levelOfDay: EnrichedLevel;
  levels: Level[];
  reviews: Review[];
}

/* istanbul ignore next */
export default function AppSWR({ levelOfDay, levels, reviews }: AppSWRProps) {
  return (
    <SWRConfig value={{ fallback: {
      [getSWRKey('/api/level-of-day')]: levelOfDay,
      [getSWRKey('/api/latest-levels')]: levels,
      [getSWRKey('/api/latest-reviews')]: reviews,
    } }}>
      <App />
    </SWRConfig>
  );
}

/* istanbul ignore next */
function App() {
  const { isLoading, user } = useUser();
  const { levelOfDay } = useLevelOfDay();
  const { userConfig } = useUserConfig();

  return (
    <Page title={'Pathology'}>
      <>
        <div className='text-center relative overflow-hidden bg-no-repeat bg-cover'>
          <div id='video_background_hero' className='flex justify-center'>
            <video autoPlay loop muted playsInline>
              <source src='https://i.imgur.com/b3BjzDz.mp4' type='video/mp4' />
            </video>
          </div>
          <div
            className='absolute top-0 right-0 bottom-0 left-0 w-full h-full overflow-hidden bg-fixed'
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
            <div className='flex justify-center items-center h-full'>
              <div className='text-white transition-blur duration-75'>
                <h2 className='font-semibold text-4xl mb-4'>Pathology</h2>
                <h4 className='font-semibold text-xl mb-6'>Find the way</h4>
                <div className='flex flex-col items-center'>
                  <Link href={user && userConfig?.tutorialCompletedAt ? '/collection/61fe329e5d3a34bc11f62345' : '/tutorial'}>
                    <a
                      className='inline-block px-5 py-3 mb-1 border-2 shadow-lg shadow-blue-500/50 border-gray-200 bg-blue-100 text-gray-800 font-medium text-xl leading-snug rounded hover:ring-4 hover:ring-offset-1 hover:border-2 focus:outline-none focus:ring-0 transition duration-150 ease-in-out'
                      role='button'
                      data-mdb-ripple='true'
                      data-mdb-ripple-color='light'>
                      {user && userConfig?.tutorialCompletedAt ? 'Campaign' : 'Play'}
                    </a>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='flex flex-col items-center'>
          <div className='flex flex-row rounded-lg m-3'
            style={{
              backgroundColor: 'var(--bg-color-2)',
            }}>
            <div className='flex flex-col items-center vertical-center self-center p-2'>
              <h1 className='text-lg'>Level of the Day</h1>
            </div>
            <div className='p-3'>
              {levelOfDay && (
                <LevelButtonDisplay level={levelOfDay} />
              )}
            </div>
          </div>
        </div>
        {isLoading ? null : user ? <HomeLoggedIn /> : <HomeDefault />}
      </>
    </Page>
  );
}
