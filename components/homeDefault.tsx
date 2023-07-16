import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import StyledTooltip from './styledTooltip';

export default function HomeDefault() {
  return (
    <>
      <div className='md:flex content-center my-6 mx-auto px-6 max-w-screen-2xl'>
        <div className='flex-auto md:w-64 p-3'>
          <span className='font-bold text-4xl'>The goal of Pathology is simple</span>
          <div className='text-xl py-3'>Get to the exit in the <span className='font-bold italic'>least number of moves</span></div>
          <div className='p-3'>Sounds easy right? Yet, this game is one of the most mind-bending puzzle games you will find. Different blocks stand in your way to the exit, and your job is to figure out the optimal route.</div>
          <figure className='p-6'>
            <Image width={1200} height={630} alt='Xisco by vanadium' src='/api/level/image/625b37dfc94d97025349830b.png' />
            <figcaption className='z-10 my-3 text-center text-sm italic' style={{
              color: 'var(--color-gray)',
            }}><Link href='/level/vanadium/xisco' className='underline'>Xisco</Link> by vanadium</figcaption>
          </figure>
          <div>Pathology is a sokoban game that was originally created in <span className='italic' data-tooltip-id='psychopath-year' data-tooltip-content='Originally named Psychopath'>2005</span>. While a simple concept, the game can become incredibly challenging and will put your brain to the test.</div>
          <StyledTooltip id='psychopath-year' />
        </div>
        <div className='flex-auto md:w-32 p-3'>
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
      <div className='flex justify-center'>
        <iframe
          className='max-w-xl m-8'
          height='500'
          sandbox='allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts'
          src='https://discord.com/widget?id=971585343956590623&theme=dark'
          title='discord'
          width='100%'
        />
      </div>
    </>
  );
}
