import Link from 'next/link';
import React, { useContext } from 'react';
import { SWRConfig } from 'swr';
import ContinuePlaying from '../components/continuePlaying';
import HomeDefault from '../components/homeDefault';
import HomeLoggedIn from '../components/homeLoggedIn';
import LevelOfTheDay from '../components/levelOfTheDay';
import Page from '../components/page';
import { AppContext } from '../contexts/appContext';
import { PageContext } from '../contexts/pageContext';
import getSWRKey from '../helpers/getSWRKey';
import useLastLevelPlayed from '../hooks/useLastLevelPlayed';
import useLevelOfDay from '../hooks/useLevelOfDay';
import dbConnect from '../lib/dbConnect';
import Level, { EnrichedLevel } from '../models/db/level';
import Review from '../models/db/review';
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
  const { userLoading, user, userConfig } = useContext(PageContext);
  const { lastLevelPlayed } = useLastLevelPlayed();
  const { levelOfDay } = useLevelOfDay();
  const { setIsLoading } = useContext(AppContext);

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
                  <Link href={user && userConfig?.tutorialCompletedAt ? '/campaign/pathology' : '/tutorial'}>
                    <a
                      className='inline-block px-6 py-2 mb-1 border-4 border-neutral-400 bg-white text-black font-bold text-3xl leading-snug rounded-lg hover:ring-4 ring-red-500/50 focus:ring-0 transition duration-100 ease-in-out'
                      onClick={() => {
                        if (user && userConfig?.tutorialCompletedAt) {
                          setIsLoading(true);
                        }
                      }}
                      role='button'
                      data-mdb-ripple='true'
                      data-mdb-ripple-color='light'
                    >
                      Play
                    </a>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='flex flex-wrap justify-center m-4 gap-4'>
          {levelOfDay && <LevelOfTheDay level={levelOfDay} />}
          {lastLevelPlayed && (
            <ContinuePlaying level={lastLevelPlayed} />
          )}
        </div>
        {userLoading ? null : user ? <HomeLoggedIn /> : <HomeDefault />}
      </>
    </Page>
  );
}
