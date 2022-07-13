import React, { useContext } from 'react';
import Dimensions from '../constants/dimensions';
import FormattedReview from './formattedReview';
import LatestLevelsTable from './latestLevelsTable';
import Link from 'next/link';
import { PageContext } from '../contexts/pageContext';
import Theme from '../constants/theme';
import classNames from 'classnames';
import useLatestLevels from '../hooks/useLatestLevels';
import useLatestReviews from '../hooks/useLatestReviews';

export default function HomeLoggedIn() {
  // NB: need to use PageContext so that forceUpdate causes a rerender
  useContext(PageContext);
  const { levels } = useLatestLevels();
  const { reviews } = useLatestReviews();

  const buttonClassNames = classNames('py-1 px-4 inline-flex justify-center items-center gap-2 rounded-md border font-medium align-middle focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm',
    document.body.className === Theme.Light ?
      'bg-green-100 hover:bg-gray-50 text-gray-700' :
      'bg-gray-800 hover:bg-slate-800 border-gray-700 text-gray-400'
  );

  return (
    <>
      <div className='flex justify-center p-6'>
        <div className='max-w-xs space-x-4 flex flex-row rounded-md shadow-sm justify-center'>
          <Link passHref href='/create'>
            <button type='button' className={buttonClassNames}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-wrench' viewBox='0 0 16 16'>
                <path d='M.102 2.223A3.004 3.004 0 0 0 3.78 5.897l6.341 6.252A3.003 3.003 0 0 0 13 16a3 3 0 1 0-.851-5.878L5.897 3.781A3.004 3.004 0 0 0 2.223.1l2.141 2.142L4 4l-1.757.364L.102 2.223zm13.37 9.019.528.026.287.445.445.287.026.529L15 13l-.242.471-.026.529-.445.287-.287.445-.529.026L13 15l-.471-.242-.529-.026-.287-.445-.445-.287-.026-.529L11 13l.242-.471.026-.529.445-.287.287-.445.529-.026L13 11l.471.242z'/>
              </svg>Create
            </button>
          </Link>
          <Link passHref href='/catalog'>
            <button type='button' className={buttonClassNames}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-book' viewBox='0 0 16 16'>
                <path d='M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z'/>
              </svg>Catalog
            </button>
          </Link>
          <Link passHref href='https://discord.gg/NsN8SBEZGN'>
            <button type='button' className={buttonClassNames}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-discord' viewBox='0 0 16 16'>
                <path d='M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.01-.059.051.051 0 0 0-.018-.011 8.875 8.875 0 0 1-1.248-.595.05.05 0 0 1-.02-.066.051.051 0 0 1 .015-.019c.084-.063.168-.129.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 0 1 .053.007c.08.066.164.132.248.195a.051.051 0 0 1-.004.085 8.254 8.254 0 0 1-1.249.594.05.05 0 0 0-.03.03.052.052 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.235 13.235 0 0 0 4.001-2.02.049.049 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019Zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612Zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612Z'/>
              </svg>Discord
            </button>
          </Link>
          <Link passHref href='/tutorial'>
            <button type='button' className={buttonClassNames}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-question-diamond-fill' viewBox='0 0 16 16'>
                <path d='M9.05.435c-.58-.58-1.52-.58-2.1 0L.436 6.95c-.58.58-.58 1.519 0 2.098l6.516 6.516c.58.58 1.519.58 2.098 0l6.516-6.516c.58-.58.58-1.519 0-2.098L9.05.435zM5.495 6.033a.237.237 0 0 1-.24-.247C5.35 4.091 6.737 3.5 8.005 3.5c1.396 0 2.672.73 2.672 2.24 0 1.08-.635 1.594-1.244 2.057-.737.559-1.01.768-1.01 1.486v.105a.25.25 0 0 1-.25.25h-.81a.25.25 0 0 1-.25-.246l-.004-.217c-.038-.927.495-1.498 1.168-1.987.59-.444.965-.736.965-1.371 0-.825-.628-1.168-1.314-1.168-.803 0-1.253.478-1.342 1.134-.018.137-.128.25-.266.25h-.825zm2.325 6.443c-.584 0-1.009-.394-1.009-.927 0-.552.425-.94 1.01-.94.609 0 1.028.388 1.028.94 0 .533-.42.927-1.029.927z'/>
              </svg>Redo tutorial
            </button>
          </Link>
        </div>
      </div>
      <div className='flex justify-center'>
        <div className='flex items-center'>
          <Link passHref href='/search' >
            <svg xmlns='http://www.w3.org/2000/svg' className='w-6 h-6 mr-2 text-white cursor-pointer' fill='none' viewBox='0 0 24 24'
              stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2'
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
            </svg>
          </Link>
          <form action='/search'>
            <input type='hidden' name='time_range' value='All'></input>
            <input type='search' name='search' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' placeholder='Search levels...' aria-label='Search' aria-describedby='button-addon2'/>
          </form>
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
              {reviews?.map((review, index) => {
                return (
                  <div
                    key={index}
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
