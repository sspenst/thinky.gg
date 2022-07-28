import { LevelModel, ReviewModel } from '../models/mongoose';
import HomeDefault from '../components/homeDefault';
import HomeLoggedIn from '../components/homeLoggedIn';
import Level from '../models/db/level';
import Page from '../components/page';
import React from 'react';
import Review from '../models/db/review';
import { SWRConfig } from 'swr';
import dbConnect from '../lib/dbConnect';
import getSWRKey from '../helpers/getSWRKey';
import useUser from '../hooks/useUser';

export async function getStaticProps() {
  await dbConnect();

  const [levels, reviews] = await Promise.all([
    LevelModel.find<Level>({ isDraft: false })
      .populate('userId', '-email -password')
      .sort({ ts: -1 })
      .limit(10),
    ReviewModel.find<Review>({ 'text': { '$exists': true } })
      .populate('levelId', '_id name slug')
      .populate('userId', '-email -password')
      .sort({ ts: -1 })
      .limit(10),
  ]);

  if (!levels) {
    throw new Error('Error finding Levels');
  }

  if (!reviews) {
    throw new Error('Error finding Reviews');
  }

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
      reviews: JSON.parse(JSON.stringify(reviews)),
    } as AppSWRProps,
    revalidate: 60 * 60,
  };
}

interface AppSWRProps {
  levels: Level[];
  reviews: Review[];
}

export default function AppSWR({ levels, reviews }: AppSWRProps) {
  return (
    <SWRConfig value={{ fallback: {
      [getSWRKey('/api/latest-levels')]: levels,
      [getSWRKey('/api/latest-reviews')]: reviews,
    } }}>
      <App />
    </SWRConfig>
  );
}

function App() {
  const { isLoading, user } = useUser();

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
                <div>
                  <a
                    className='inline-block px-5 py-3 mb-1 border-2 shadow-lg shadow-blue-500/50 border-gray-200 bg-blue-100 text-gray-800 font-medium text-xl leading-snug rounded hover:ring-4 hover:ring-offset-1 hover:border-2 focus:outline-none focus:ring-0 transition duration-150 ease-in-out'
                    href={user ? '/world/61fe329e5d3a34bc11f62345' : '/tutorial'}
                    role='button'
                    data-mdb-ripple='true'
                    data-mdb-ripple-color='light'>
                    {user ? 'Campaign' : 'Play'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        {isLoading ? null : user ? <HomeLoggedIn/> : <HomeDefault/>}
      </>
    </Page>
  );
}
