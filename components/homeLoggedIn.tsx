import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useState } from 'react';
import Dimensions from '../constants/dimensions';
import Theme from '../constants/theme';
import TimeRange from '../constants/timeRange';
import { AppContext } from '../contexts/appContext';
import { FilterSelectOption } from '../helpers/filterSelectOptions';
import getProfileSlug from '../helpers/getProfileSlug';
import isTheme from '../helpers/isTheme';
import { EnrichedLevel } from '../models/db/level';
import Review from '../models/db/review';
import User from '../models/db/user';
import Avatar from './avatar';
import FormattedReview from './formattedReview';
import LevelSelect from './levelSelect';
import LoadingCard from './loadingCard';
import LoadingSpinner from './loadingSpinner';
import MultiSelectUser from './multiSelectUser';
import OnlineUsers from './onlineUsers';
import RecommendedLevel from './recommendedLevel';
import RoleIcons from './roleIcons';

interface HomeLoggedInProps {
  lastLevelPlayed?: EnrichedLevel;
  latestLevels?: EnrichedLevel[];
  latestReviews?: Review[];
  levelOfDay?: EnrichedLevel;
  recommendedEasyLevel?: EnrichedLevel | null;
  recommendedPendingLevel?: EnrichedLevel | null;
  topLevelsThisMonth?: EnrichedLevel[];
  user: User;
}

export default function HomeLoggedIn({
  lastLevelPlayed,
  latestLevels,
  latestReviews,
  levelOfDay,
  recommendedEasyLevel,
  recommendedPendingLevel,
  topLevelsThisMonth,
  user,
}: HomeLoggedInProps) {
  const { multiplayerSocket, userConfig } = useContext(AppContext);
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { matches, socket } = multiplayerSocket;
  const buttonClassNames = classNames('py-2.5 px-3.5 inline-flex justify-center items-center gap-2 rounded-md border font-medium align-middle focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm whitespace-nowrap',
    isTheme(Theme.Light) ?
      'bg-green-100 hover:bg-gray-50 border-gray-300 text-gray-700' :
      'bg-gray-800 hover:bg-slate-600 border-gray-700 text-gray-300'
  );

  return (<>
    <div className='flex flex-col gap-4 m-4 items-center'>
      <div className='flex flex-row flex-wrap gap-3 justify-center'>
        <div className='flex gap-2 items-center'>
          <span className='font-bold flex justify-center text-2xl'>Welcome, {user.name}</span>
          <RoleIcons size={20} user={user} />
        </div>
        <OnlineUsers />
      </div>
      <div className='flex justify-center items-center flex-wrap gap-6'>
        <div className='flex flex-col gap-2'>
          <Link href={getProfileSlug(user)} passHref>
            <Avatar hideStatusCircle={true} size={Dimensions.AvatarSizeLarge} user={user} />
          </Link>
          <span className='flex justify-center font-bold'>{user.score}</span>
        </div>
        <div className='flex flex-col gap-2'>
          <Link
            className='inline-block px-3 py-1.5 border-4 border-neutral-400 bg-white text-black font-bold text-3xl leading-snug rounded-xl hover:ring-4 hover:bg-blue-500 hover:text-white ring-blue-500/50 focus:ring-0 text-center'
            style={{
              animationDelay: '0.5s',
            }}
            data-mdb-ripple='true'
            data-mdb-ripple-color='light'
            href={userConfig && !userConfig.tutorialCompletedAt ? '/tutorial' : '/play'}
            role='button'
          >
            {userConfig && !userConfig.tutorialCompletedAt ? 'Start' : 'Play'}
          </Link>
          <Link passHref href='/multiplayer' className={buttonClassNames}>
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' />
            </svg>
            <div className='flex flex-col'>
              <span>Multiplayer</span>
              {socket?.connected && matches.length > 0 &&
                <span className='text-xs text-green-300'>
                  {`${matches.length} current match${matches.length === 1 ? '' : 'es'}`}
                </span>
              }
            </div>
          </Link>
          <Link passHref href='/create' className={buttonClassNames}>
            <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-wrench' viewBox='0 0 16 16'>
              <path d='M.102 2.223A3.004 3.004 0 0 0 3.78 5.897l6.341 6.252A3.003 3.003 0 0 0 13 16a3 3 0 1 0-.851-5.878L5.897 3.781A3.004 3.004 0 0 0 2.223.1l2.141 2.142L4 4l-1.757.364L.102 2.223zm13.37 9.019.528.026.287.445.445.287.026.529L15 13l-.242.471-.026.529-.445.287-.287.445-.529.026L13 15l-.471-.242-.529-.026-.287-.445-.445-.287-.026-.529L11 13l.242-.471.026-.529.445-.287.287-.445.529-.026L13 11l.471.242z' />
            </svg>Create
          </Link>
        </div>
      </div>
    </div>
    <div className='flex flex-wrap justify-center m-4 gap-4'>
      <RecommendedLevel id='level-of-day' level={levelOfDay} title='Level of the Day' />
      <RecommendedLevel id='recommended-easy-level' level={recommendedEasyLevel} title='Try this Level' />
      <RecommendedLevel id='recommended-pending-level' level={recommendedPendingLevel} title='Unexplored' />
      {lastLevelPlayed && <RecommendedLevel id='last-level-played' level={lastLevelPlayed} title='Continue Playing' />}
    </div>
    <div className='flex justify-center m-6'>
      <div className='max-w-xs space-y-2 md:space-y-0 md:space-x-4 flex flex-col md:flex-row rounded-md justify-center'>
        <Link passHref href='/tutorial' className={buttonClassNames}>
          <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={1}>
            <path d='M12 14l9-5-9-5-9 5 9 5z' />
            <path d='M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' />
            <path strokeLinecap='round' strokeLinejoin='round' d='M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222' />
          </svg>Tutorial
        </Link>
        <Link passHref href='/campaigns' className={buttonClassNames}>
          <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-book' viewBox='0 0 16 16'>
            <path d='M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z' />
          </svg>Community Campaigns
        </Link>
        <Link passHref href='/users' className={buttonClassNames}>
          <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-list-ol' viewBox='0 0 16 16'>
            <path fillRule='evenodd' d='M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z' />
            <path d='M1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.361-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588-.002.954.291.957.703a.595.595 0 0 1-.492.594v.033a.615.615 0 0 1 .569.631c.003.533-.502.8-1.051.8-.656 0-1-.37-1.008-.794h.582c.008.178.186.306.422.309.254 0 .424-.145.422-.35-.002-.195-.155-.348-.414-.348h-.3zm-.004-4.699h-.604v-.035c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054V9H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338v.041zM2.564 5h-.635V2.924h-.031l-.598.42v-.567l.629-.443h.635V5z' />
          </svg>Users
        </Link>
        <Link passHref href='/catalog' className={buttonClassNames}>
          <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-book' viewBox='0 0 16 16'>
            <path d='M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z' />
          </svg>Catalog
        </Link>
      </div>
    </div>
    <div className='flex items-center justify-center'>
      <div className='flex flex-col'>
        <div className='flex items-center'>
          <form action='/search'>
            <input type='hidden' name='time_range' value='All' />
            <input onChange={e => setSearch(e.target.value)} id='search' type='search' name='search' className='form-control relative flex-auto min-w-0 block w-52 px-2.5 py-1.5 h-10 text-base font-normal text-gray-700 placeholder:text-gray-400 bg-white bg-clip-padding border border-solid border-gray-300 rounded-md rounded-r-none rounded-b-none transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' placeholder='Search levels...' aria-label='Search' aria-describedby='button-addon2' />
          </form>
        </div>
        <div>
          <MultiSelectUser
            controlStyles={{
              borderBottomLeftRadius: '0.375rem',
              borderBottomRightRadius: '0rem',
              borderTopLeftRadius: '0rem',
              borderTopRightRadius: '0rem',
            }}
            onSelect={(selectedItem: User) => {
              router.push(
                {
                  pathname: getProfileSlug(selectedItem),
                }
              );
            }}
          />
        </div>
      </div>
      <Link
        className={classNames(buttonClassNames, 'py-1.5 h-20 mr-0 rounded-l-none cursor-pointer')}
        href={{
          pathname: '/search',
          query: {
            search: search,
            time_range: TimeRange[TimeRange.All],
          },
        }}
        passHref
      >
        <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' fill='none' viewBox='0 0 24 24'
          stroke='currentColor'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2'
            d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
        </svg>
      </Link>
    </div>
    <div className='flex flex-wrap justify-center max-w-screen-2xl mx-auto'>
      <div className='w-full pt-8 px-4'>
        <div id='top-levels-of-month' className='flex justify-center'>
          <Link
            className='font-bold text-xl text-center hover:underline'
            href={{
              pathname: '/search',
              query: {
                sort_by: 'reviews_score',
                time_range: TimeRange[TimeRange.Month],
              },
            }}
          >
            Top Levels this Month:
          </Link>
        </div>
        {topLevelsThisMonth ?
          <LevelSelect levels={topLevelsThisMonth} /> :
          <div className='flex flex-wrap justify-center'>
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>
        }
      </div>
      <div className='w-full md:w-1/2 p-4'>
        <div id='latest-levels' className='flex justify-center'>
          <Link
            className='font-bold text-xl text-center hover:underline'
            href={{
              pathname: '/search',
              query: {
                show_filter: FilterSelectOption.HideWon,
                sort_by: 'ts',
                time_range: TimeRange[TimeRange.All],
              },
            }}
          >
            Latest Unsolved Levels:
          </Link>
        </div>
        {latestLevels ? <LevelSelect levels={latestLevels} /> :
          <div className='flex flex-wrap justify-center'>
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>
        }
      </div>
      <div id='latest-reviews' className='w-full md:w-1/2 pt-4'>
        <h2 className='font-bold text-xl text-center'>Latest Reviews:</h2>
        <div
          style={{
            textAlign: 'center',
          }}
        >
          {latestReviews ? latestReviews?.map(review => {
            return (
              <div
                className='mx-4 md:mx-8 my-4'
                key={`review-${review._id.toString()}`}
              >
                <FormattedReview
                  level={review.levelId}
                  review={review}
                  user={review.userId}
                />
              </div>
            );
          }) : <div className='flex justify-center p-4'><LoadingSpinner /></div>}
        </div>
      </div>
      <iframe className='p-4' src='https://discord.com/widget?id=971585343956590623&theme=dark' width='640' height='640' sandbox='allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts' />
    </div>
  </>);
}
