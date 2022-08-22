import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext, useState } from 'react';
import Dimensions from '../constants/dimensions';
import Theme from '../constants/theme';
import TimeRange from '../constants/timeRange';
import { PageContext } from '../contexts/pageContext';
import useLatestLevels from '../hooks/useLatestLevels';
import useLatestReviews from '../hooks/useLatestReviews';
import FormattedReview from './formattedReview';
import LatestLevelsTable from './latestLevelsTable';

export default function HomeLoggedIn() {
  // NB: need to use PageContext so that forceUpdate causes a rerender
  useContext(PageContext);
  const { levels } = useLatestLevels();
  const { reviews } = useLatestReviews();
  const [search, setSearch] = useState('');

  const buttonClassNames = classNames('py-3 px-4 inline-flex justify-center items-center gap-2 rounded-md border font-medium align-middle focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm',
    document.body.className === Theme.Light ?
      'bg-green-100 hover:bg-gray-50 text-gray-700' :
      'bg-gray-800 hover:bg-slate-600 border-gray-700 text-gray-300'
  );

  return (
    <>
      <div className='flex justify-center p-6'>
        <div className='max-w-xs space-y-2 md:space-y-0 md:space-x-4 flex flex-col md:flex-row rounded-md justify-center'>
          <Link passHref href='/catalog/all'>
            <a className={buttonClassNames}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-book' viewBox='0 0 16 16'>
                <path d='M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z' />
              </svg>Catalog
            </a>
          </Link>
          <Link passHref href='/collections/all'>
            <a className={buttonClassNames}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-book' viewBox='0 0 16 16'>
                <path d='M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z' />
              </svg>Collections
            </a>
          </Link>
          <Link passHref href='/create'>
            <a className={buttonClassNames}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-wrench' viewBox='0 0 16 16'>
                <path d='M.102 2.223A3.004 3.004 0 0 0 3.78 5.897l6.341 6.252A3.003 3.003 0 0 0 13 16a3 3 0 1 0-.851-5.878L5.897 3.781A3.004 3.004 0 0 0 2.223.1l2.141 2.142L4 4l-1.757.364L.102 2.223zm13.37 9.019.528.026.287.445.445.287.026.529L15 13l-.242.471-.026.529-.445.287-.287.445-.529.026L13 15l-.471-.242-.529-.026-.287-.445-.445-.287-.026-.529L11 13l.242-.471.026-.529.445-.287.287-.445.529-.026L13 11l.471.242z' />
              </svg>Create
            </a>
          </Link>
          <Link passHref href='/statistics'>
            <a className={buttonClassNames}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-list-ol" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z" />
                <path d="M1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.361-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588-.002.954.291.957.703a.595.595 0 0 1-.492.594v.033a.615.615 0 0 1 .569.631c.003.533-.502.8-1.051.8-.656 0-1-.37-1.008-.794h.582c.008.178.186.306.422.309.254 0 .424-.145.422-.35-.002-.195-.155-.348-.414-.348h-.3zm-.004-4.699h-.604v-.035c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054V9H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338v.041zM2.564 5h-.635V2.924h-.031l-.598.42v-.567l.629-.443h.635V5z" />
              </svg>Statistics
            </a>
          </Link>
          <Link passHref href='/tutorial'>
            <a className={buttonClassNames}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>Tutorial
            </a>
          </Link>
          <Link passHref href='https://discord.gg/NsN8SBEZGN'>
            <a className={buttonClassNames}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-discord' viewBox='0 0 16 16'>
                <path d='M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.01-.059.051.051 0 0 0-.018-.011 8.875 8.875 0 0 1-1.248-.595.05.05 0 0 1-.02-.066.051.051 0 0 1 .015-.019c.084-.063.168-.129.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 0 1 .053.007c.08.066.164.132.248.195a.051.051 0 0 1-.004.085 8.254 8.254 0 0 1-1.249.594.05.05 0 0 0-.03.03.052.052 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.235 13.235 0 0 0 4.001-2.02.049.049 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019Zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612Zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612Z' />
              </svg>Discord
            </a>
          </Link>
        </div>
      </div>
      <div className='flex justify-center'>
        <div className='flex items-center'>
          <form action='/search'>
            <input type='hidden' name='time_range' value='All'></input>
            <input onChange={e => setSearch(e.target.value)} id='search' type='search' name='search' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 h-10 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded rounded-r-none transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' placeholder='Search levels...' aria-label='Search' aria-describedby='button-addon2' />
          </form>
          <Link href={{
            pathname: '/search',
            query: {
              search: search,
              time_range: TimeRange[TimeRange.All],
            },
          }} passHref>
            <a className={classNames(buttonClassNames, 'py-1.5 h-10 mr-0 rounded-l-none cursor-pointer')}>
              <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5 text-white' fill='none' viewBox='0 0 24 24'
                stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2'
                  d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
              </svg>
            </a>
          </Link>
        </div>
      </div>
      <div>
        <div className='flex flex-wrap justify-center'>
          <div className='w-full md:w-1/2 p-4'>
            <h2 className='font-bold text-lg text-center'>Latest Levels:</h2>
            {levels && <LatestLevelsTable levels={levels} />}
          </div>
          <div className='w-full md:w-1/2 p-4'>
            <h2 className='font-bold text-lg text-center'>Latest Reviews:</h2>
            <div
              style={{
                textAlign: 'center',
              }}
            >
              {reviews?.map(review => {
                return (
                  <div
                    key={`review-${review._id.toString()}`}
                    style={{
                      margin: Dimensions.TableMargin,
                    }}
                  >
                    <FormattedReview
                      level={review.levelId}
                      review={review}
                      user={review.userId}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
