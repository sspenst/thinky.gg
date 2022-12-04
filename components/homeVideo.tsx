import Link from 'next/link';
import React, { useContext } from 'react';
import { AppContext } from '../contexts/appContext';
import { PageContext } from '../contexts/pageContext';

export default function HomeVideo() {
  const { setIsLoading } = useContext(AppContext);
  const { userConfig } = useContext(PageContext);

  return (
    <div className='grid grid-cols-1 grid-rows-1 place-items-center'>
      <div id='video_background_hero' className='row-start-1 col-start-1 z-10'>
        <video autoPlay loop muted playsInline>
          <source src='https://i.imgur.com/b3BjzDz.mp4' type='video/mp4' />
        </video>
      </div>
      <div
        className='text-center select-none w-full h-full row-start-1 col-start-1 z-20'
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
        <div className='flex justify-center items-center h-full'>
          <div className='text-white transition-blur duration-75'>
            <h2 className='fadeIn font-semibold text-4xl my-4'>Pathology</h2>
            <h4 className='fadeIn font-semibold text-xl mb-6'>Find the way</h4>
            <div className='flex flex-col items-center mb-4'>
              <Link
                className='fadeIn inline-block px-3 py-1.5 mb-1 border-4 border-neutral-400 bg-white text-black font-bold text-3xl leading-snug rounded-xl hover:ring-4 hover:bg-blue-500 hover:text-white ring-blue-500/50 focus:ring-0 transition duration-400 ease-in-out'
                style={{
                  animationDelay: '0.5s',
                }}
                data-mdb-ripple='true'
                data-mdb-ripple-color='light'
                href={userConfig?.tutorialCompletedAt ? '/play' : '/tutorial'}
                onClick={() => {
                  if (userConfig?.tutorialCompletedAt) {
                    setIsLoading(true);
                  }
                }}
                role='button'
              >
                {userConfig?.tutorialCompletedAt ? 'Play' : 'Start'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
