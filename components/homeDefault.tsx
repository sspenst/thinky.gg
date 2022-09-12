import classNames from 'classnames';
import Image from 'next/image';
import Link from 'next/link';
import React, { useContext } from 'react';
import Theme from '../constants/theme';
import { PageContext } from '../contexts/pageContext';

export default function HomeDefault() {
  // NB: need to use PageContext so that forceUpdate causes a rerender
  useContext(PageContext);

  const discordClassNames = document.body.className === Theme.Light ?
    'bg-white hover:bg-gray-50 text-gray-700' :
    'bg-gray-800 hover:bg-slate-800 border-gray-700 text-gray-400';

  return (
    <>
      <div className='sm:flex m-6'>
        <div className='flex-auto sm:w-64 p-3'>
          <span className='font-bold text-4xl'>The goal of Pathology is simple.</span>
          <div className='text-xl py-3'>Get to the exit in the <span className='font-bold italic'>least number of moves</span>.</div>
          <div className='p-3'>Sounds simple right? Yet, this game is one of the most mind-bending puzzle games you will find. Different blocks stand in your way to the exit, and your job is to figure out the optimal route.</div>
          <figure className='p-6'>
            <Image width={1200} height={630} alt='Xisco by vanadium' src='/api/level/image/625b37dfc94d97025349830b.png' />
            <figcaption className='z-10 mb-3 text-sm italic' style={{ color: 'var(--bg-color-4)' }}><Link href='/level/vanadium/xisco'><a className='underline'>Xisco</a></Link> by vanadium</figcaption>
          </figure>
          <div>Pathology is a game that was originally created in 2005<sup><a className='cursor-pointer' title='Previously named Psychopath'>[?]</a></sup>. While a simple concept, the game can become incredibly challenging and will put your brain to the test.</div>
        </div>
        <div className='flex-auto sm:w-32 p-3'>
          <span className='font-bold text-4xl'>An active community</span>
          <div className='p-3'>has helped build <span className='italic'>thousands</span> of levels over multiple decades. A level and collection editor allows you to build your own challenging levels for the world of Pathology players.</div>
          <div className='p-3 w-full'>
            <div className='grid grid-cols-2'>
              <figure>
                <Image width={1200} height={630} alt='The Tower by Raszlo' src='/api/level/image/61fe3c372cdc920ef6f80190.png' />
                <figcaption className='z-10 mb-3 text-sm italic' style={{ color: 'var(--bg-color-4)' }}><Link href='/level/raszlo/the-tower'><a className='underline'>The Tower</a></Link> by Raszlo</figcaption>
              </figure>
              <figure>
                <Image width={1200} height={630} alt='Origin of Symmetry by timhalbert' src='/api/level/image/61fe3925fb8725d5440bc3fb.png' />
                <figcaption className='z-10 mb-3 text-sm italic' style={{ color: 'var(--bg-color-4)' }}><Link href='/level/timhalbert/level-16-origin-of-symmetry'><a className='underline'>Origin of Symmetry</a></Link> by timhalbert</figcaption>
              </figure>
            </div>
          </div>
          <div className='text-left'>Join the <Link passHref href='https://discord.gg/NsN8SBEZGN'>
            <a className={classNames('px-1 inline-flex justify-center items-center gap-2 rounded-md border font-medium align-middle focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm', discordClassNames)}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-discord' viewBox='0 0 16 16'>
                <path d='M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.01-.059.051.051 0 0 0-.018-.011 8.875 8.875 0 0 1-1.248-.595.05.05 0 0 1-.02-.066.051.051 0 0 1 .015-.019c.084-.063.168-.129.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 0 1 .053.007c.08.066.164.132.248.195a.051.051 0 0 1-.004.085 8.254 8.254 0 0 1-1.249.594.05.05 0 0 0-.03.03.052.052 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.235 13.235 0 0 0 4.001-2.02.049.049 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019Zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612Zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612Z' />
              </svg>Discord community
            </a>
          </Link>
          </div>

        </div>
      </div>
    </>
  );
}
