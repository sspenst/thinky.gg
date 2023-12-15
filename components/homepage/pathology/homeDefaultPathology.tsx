import useLevelOfDay from '@root/hooks/useLevelOfDay';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import StyledTooltip from '../../page/styledTooltip';
import HomeVideo from '../homeVideo';
import RecommendedLevel from '../recommendedLevel';

export default function HomeDefaultPathology() {
  const { levelOfDay } = useLevelOfDay();

  return (
    <>
      <HomeVideo />
      <div className='flex flex-wrap justify-center m-4'>
        {levelOfDay &&
        <RecommendedLevel
          id='level-of-day'
          level={levelOfDay}
          title='Level of the Day'
          tooltip={'Every day there is a new level of the day. Difficulty increases throughout the week!'}
        />
        }
      </div>
      <>
        <div className='flex flex-col items-center m-6 gap-8'>
          <div className='max-w-screen-md p-3'>
            <span className='font-bold text-4xl'>The goal of Pathology is simple</span>
            <div className='text-xl py-3'>Get to the exit in the <span className='font-bold italic'>least number of moves</span></div>
            <div className='p-3'>Sounds easy right? Yet, this game is one of the most mind-bending puzzle games you will find. Different blocks stand in your way to the exit, and your job is to figure out the optimal route.</div>
            <figure className='p-6'>
              <Image width={1200} height={630} alt='Xisco by vanadium' src='/api/level/image/625b37dfc94d97025349830b.png' />
              <figcaption className='z-10 my-3 text-center text-sm italic' style={{
                color: 'var(--color-gray)',
              }}><Link href='/level/vanadium/xisco' className='underline'>Xisco</Link> by vanadium</figcaption>
            </figure>
            <div>Pathology is a sokoban type game that was originally created in <span className='italic' data-tooltip-id='psychopath-year' data-tooltip-content='Originally named Psychopath'>2005</span>. While a simple concept, the game can become incredibly challenging and will put your brain to the test.</div>
            <StyledTooltip id='psychopath-year' />
          </div>
          <div className='max-w-screen-md p-3'>
            <span className='font-bold text-4xl'>An active community</span>
            <div className='p-3'>has helped build <span className='italic'>thousands</span> of levels over multiple decades. A level and collection editor allows you to build your own challenging levels for the world of Pathology players.</div>
            <div className='p-3 w-full'>
              <div className='flex flex-col'>
                <figure>
                  <Image width={1200} height={630} alt='The Tower by Raszlo' src='/api/level/image/61fe3c372cdc920ef6f80190.png' />
                  <figcaption className='z-10 my-3 text-center text-sm italic' style={{
                    color: 'var(--color-gray)',
                  }}><Link href='/level/raszlo/the-tower' className='underline'>The Tower</Link> by Raszlo</figcaption>
                </figure>
                <figure>
                  <Image width={1200} height={630} alt='Origin of Symmetry by timhalbert' src='/api/level/image/61fe3925fb8725d5440bc3fb.png' />
                  <figcaption className='z-10 my-3 text-center text-sm italic' style={{
                    color: 'var(--color-gray)',
                  }}>
                    <Link href='/level/timhalbert/level-16-origin-of-symmetry' className='underline'>Origin of Symmetry</Link> by timhalbert</figcaption>
                </figure>
              </div>
            </div>
          </div>
        </div>
      </>
    </>
  );
}
