import Link from 'next/link';
import React, { useContext } from 'react';
import { AppContext } from '../contexts/appContext';
import { PageContext } from '../contexts/pageContext';
import useLastLevelPlayed from '../hooks/useLastLevelPlayed';
import useLevelOfDay from '../hooks/useLevelOfDay';
import ContinuePlaying from './continuePlaying';
import HomeDefault from './homeDefault';
import HomeLoggedIn from './homeLoggedIn';
import LevelOfTheDay from './levelOfTheDay';

export default function Home() {
  const { lastLevelPlayed } = useLastLevelPlayed();
  const { levelOfDay } = useLevelOfDay();
  const { setIsLoading } = useContext(AppContext);
  const { user, userConfig, userLoading } = useContext(PageContext);

  return (<>
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
              <Link
                className='inline-block px-6 py-2 mb-1 border-4 border-neutral-400 bg-white text-black font-bold text-3xl leading-snug rounded-lg hover:ring-4 ring-red-500/50 focus:ring-0 transition duration-100 ease-in-out'
                data-mdb-ripple='true'
                data-mdb-ripple-color='light'
                href={user && userConfig?.tutorialCompletedAt ? '/campaign/pathology' : '/tutorial'}
                onClick={() => {
                  if (user && userConfig?.tutorialCompletedAt) {
                    setIsLoading(true);
                  }
                }}
                role='button'
              >
                Play
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
  </>);
}
