import Link from 'next/link';
import React from 'react';
import { SWRConfig } from 'swr';
import HomeDefault from '../components/homeDefault';
import HomeLoggedIn from '../components/homeLoggedIn';
import Page from '../components/page';
import getSWRKey from '../helpers/getSWRKey';
import useLevelBySlug from '../hooks/useLevelBySlug';
import useUser from '../hooks/useUser';
import useUserConfig from '../hooks/useUserConfig';
import dbConnect from '../lib/dbConnect';
import Level, { EnrichedLevel } from '../models/db/level';
import Review from '../models/db/review';
import { getLatestLevels } from './api/latest-levels';
import { getLatestReviews } from './api/latest-reviews';
import levelOfTheDay, { getLevelOfDay } from './api/level-of-the-day';

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
      levelOfDayPreload: JSON.parse(JSON.stringify(levelOfDay)),
      levels: JSON.parse(JSON.stringify(levels)),
      reviews: JSON.parse(JSON.stringify(reviews)),
    } as AppSWRProps,
    revalidate: 60 * 60,
  };
}

interface AppSWRProps {
  levelOfDayPreload: EnrichedLevel;
  levels: Level[];
  reviews: Review[];
}

/* istanbul ignore next */
export default function AppSWR({ levelOfDayPreload, levels, reviews }: AppSWRProps) {
  return (
    <SWRConfig value={{ fallback: {
      [getSWRKey('/api/level-of-the-day')]: levelOfDayPreload,
      [getSWRKey('/api/latest-levels')]: levels,
      [getSWRKey('/api/latest-reviews')]: reviews,
    } }}>
      <App levelOfDayPreload={levelOfDayPreload} />
    </SWRConfig>
  );
}

/* istanbul ignore next */
function App({ levelOfDayPreload }: {levelOfDayPreload: EnrichedLevel}): JSX.Element {
  const { isLoading, user } = useUser();
  const { userConfig } = useUserConfig();
  const { level } = useLevelBySlug(levelOfDayPreload?.slug);
  const levelOfDay = level || levelOfDayPreload;

  console.log(levelOfDayPreload);

  const levelOfDayClass = levelOfDay.userMoves ? (levelOfDay?.userMoves === levelOfDay?.leastMoves ? 'bg-green-100' : 'bg-yellow-100' ) : 'bg-gray-200';

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
                  <Link href={'level/' + levelOfDay.slug}>
                    <a
                      className={'inline-block p-2 mt-2 border-2 shadow-lg shadow-blue-500/50 border-white-200 ' + levelOfDayClass + ' text-gray-800 font-medium text-xs leading-snug rounded hover:ring-4 hover:ring-offset-1 hover:border-2 focus:outline-none focus:ring-0 transition duration-150 ease-in-out'}
                      role='button'
                      data-mdb-ripple='true'
                      data-mdb-ripple-color='light'>
                      Level of the Day
                    </a>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        {isLoading ? null : user ? <HomeLoggedIn /> : <HomeDefault />}
      </>
    </Page>
  );
}
