import LevelCard from '@root/components/cards/levelCard';
import FormattedDate from '@root/components/formatted/formattedDate';
import TimeRange from '@root/constants/timeRange';
import { blueButton } from '@root/helpers/className';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { redirectToLogin } from '@root/helpers/redirectToLogin';
import classNames from 'classnames';
import debounce from 'debounce';
import { FilterQuery } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ParsedUrlQueryInput } from 'querystring';
import React, { useCallback, useMemo, useState } from 'react';
import Page from '../../../components/page/page';
import { getUserFromToken } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel } from '../../../models/mongoose';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req);
  const game = getGameFromId(gameId);
  const pageParam = context.query?.page ? parseInt(context.query.page as string) : 1;
  const page = isNaN(pageParam) ? 1 : pageParam;
  const levelsPerPage = 50;
  const search = (context.query?.search as string) || '';

  if (game.isNotAGame) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  if (!reqUser) {
    return redirectToLogin(context);
  }

  // Build search query
  const searchQuery: FilterQuery<Level> = {
    isDeleted: { $ne: true },
    isDraft: true,
    userId: reqUser._id,
    gameId: gameId
  };

  // Add name search filter if search term is provided
  if (search) {
    searchQuery.name = { $regex: search, $options: 'i' };
  }

  // Get total count of draft levels with search filter
  const totalCount = await LevelModel.countDocuments(searchQuery);

  // Get paginated levels with search filter
  const levels = await LevelModel.find<Level>(searchQuery)
    .sort({ updatedAt: -1 })
    .skip((page - 1) * levelsPerPage)
    .limit(levelsPerPage);

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
      user: JSON.parse(JSON.stringify(reqUser)),
      page: page,
      totalCount: totalCount,
      levelsPerPage: levelsPerPage,
      search: search,
    },
  };
}

export interface CreatePageProps {
  levels: Level[];
  user: User;
  page: number;
  totalCount: number;
  levelsPerPage: number;
  search: string;
}

type SortOption = 'name' | 'date';

interface RouterQuery extends ParsedUrlQueryInput {
  page?: string;
  search?: string;
}

/* istanbul ignore next */
export default function Create({ levels, user, page, totalCount, levelsPerPage, search }: CreatePageProps) {
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [searchText, setSearchText] = useState(search);
  const router = useRouter();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setSearchTextDebounce = useCallback(
    debounce((searchTerm: string) => {
      const query: RouterQuery = {};

      // Always set page to 1 when searching
      query.page = '1';

      if (searchTerm) {
        query.search = searchTerm;
      }

      router.push({
        pathname: '/drafts',
        query: query,
      });
    }, 500), []);

  const sortedLevels = useMemo(() => {
    // Since levels are already paginated from the server, we only sort the current page
    const levelsCopy = [...levels];

    if (sortBy === 'name') {
      return levelsCopy.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      return levelsCopy.sort((a, b) => {
        // Use updatedAt if available, otherwise fall back to ts (convert from seconds to milliseconds)
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.ts * 1000);
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.ts * 1000);

        return bTime - aTime; // Most recent first
      });
    }
  }, [levels, sortBy]);

  const totalPages = Math.ceil(totalCount / levelsPerPage);

  return (
    <Page title='Drafts'>
      <div className='flex flex-col gap-5 m-5 items-center'>
        <h1 className='text-3xl font-bold text-center'>
          Your Draft Levels
        </h1>
        <ul>
          <li>Create a new level and save your changes</li>
          <li><span className='font-bold'>Test</span> your level to set a step count</li>
          <li><span className='font-bold'>Publish</span> your level for everyone to play!</li>
          <li>You can unpublish or archive a level at any time</li>
        </ul>
        <div className='flex items-center flex-wrap justify-center gap-4'>
          <Link
            className={classNames('flex items-center gap-2', blueButton)}
            href='/create'
          >
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='2 2 20 20' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
            </svg>
            <span>Create Level</span>
          </Link>
          <Link
            className='py-2 px-4 rounded-lg hover:bg-neutral-500'
            href={{
              pathname: '/search',
              query: {
                searchAuthor: user.name,
                sortBy: 'ts',
                timeRange: TimeRange[TimeRange.All],
              },
            }}
          >
            Your Published Levels
          </Link>
          <Link
            className='py-2 px-4 rounded-lg hover:bg-neutral-500'
            href={`/profile/${user.name}/collections`}
          >
            Your Collections
          </Link>
        </div>
        {/* Search */}
        <div className='flex justify-center'>
          <div className='p-2'>
            <input
              aria-label='Search draft levels'
              id='search-drafts'
              onChange={e => {
                setSearchText(e.target.value);
                setSearchTextDebounce(e.target.value);
              }}
              placeholder={`Search ${totalCount} draft level${totalCount !== 1 ? 's' : ''}...`}
              type='search'
              value={searchText}
              className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
          </div>
        </div>
        {/* Sort Controls */}
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium'>Sort by:</span>
          <button
            onClick={() => setSortBy('name')}
            className={classNames(
              'px-3 py-1 rounded-md text-sm transition-colors',
              sortBy === 'name'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            )}
          >
            Name
          </button>
          <button
            onClick={() => setSortBy('date')}
            className={classNames(
              'px-3 py-1 rounded-md text-sm transition-colors',
              sortBy === 'date'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            )}
          >
            Last Modified
          </button>
        </div>
        
        <div className='flex flex-wrap justify-center gap-4'>
          {sortedLevels.map(level => {
            return (
              <div key={`draft-level-div-${level._id.toString()}`} className='flex flex-col'>
                <LevelCard
                  href={`/edit/${level._id.toString()}`}
                  id='draft-level'
                  key={`draft-level-${level._id.toString()}`}
                  level={level}
                />
                <span className='text-center'><FormattedDate prefix='Updated' date={level?.updatedAt} className='italic text-xs' /></span>
              </div>
            );
          })}
        </div>
        {/* Pagination */}
        {totalCount > levelsPerPage && (
          <div className='flex justify-center flex-row'>
            {page > 1 && (
              <Link
                className='ml-2 underline'
                href={{
                  pathname: '/drafts',
                  query: {
                    ...(page !== 2 && { page: page - 1 }),
                    ...(searchText && { search: searchText }),
                  }
                }}
              >
                Previous
              </Link>
            )}
            <div id='page-number' className='ml-2'>{page} of {totalPages}</div>
            {totalCount > (page * levelsPerPage) && (
              <Link
                className='ml-2 underline'
                href={{
                  pathname: '/drafts',
                  query: {
                    page: page + 1,
                    ...(searchText && { search: searchText }),
                  }
                }}
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}
