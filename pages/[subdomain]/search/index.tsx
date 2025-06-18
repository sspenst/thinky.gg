import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { PlayLaterToggleButton } from '@root/components/cards/playLaterToggleButton';
import FormattedDate from '@root/components/formatted/formattedDate';
import FormattedUser from '@root/components/formatted/formattedUser';
import StyledTooltip from '@root/components/page/styledTooltip';
import DataTable, { TableColumn } from '@root/components/tables/dataTable';
import Dimensions from '@root/constants/dimensions';
import { Game, GameType } from '@root/constants/Games';
import StatFilter from '@root/constants/statFilter';
import { AppContext } from '@root/contexts/appContext';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import isPro from '@root/helpers/isPro';
import useRouterQuery from '@root/hooks/useRouterQuery';
import { CollectionType } from '@root/models/constants/collection';
import { EnrichedCollection } from '@root/models/db/collection';
import classNames from 'classnames';
import { Search as SearchIcon } from 'lucide-react';
import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import nProgress from 'nprogress';
import { ParsedUrlQuery } from 'querystring';
import React, { Fragment, useCallback, useContext, useEffect, useState } from 'react';
import FilterButton from '../../../components/buttons/filterButton';
import FormattedDifficulty, { difficultyList, getDifficultyColor } from '../../../components/formatted/formattedDifficulty';
import FormattedLevelLink from '../../../components/formatted/formattedLevelLink';
import MultiSelectUser from '../../../components/page/multiSelectUser';
import Page from '../../../components/page/page';
import TimeRange from '../../../constants/timeRange';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import { EnrichedLevel } from '../../../models/db/level';
import User from '../../../models/db/user';
import { doQuery } from '../../api/search';

export enum BlockFilterMask {
  NONE = 0,
  BLOCK = 1,
  HOLE = 2,
  RESTRICTED = 4,
}

export interface SearchQuery extends ParsedUrlQuery {
  blockFilter?: string;
  difficultyFilter?: string;
  disableCount?: string;
  excludeLevelIds?: string;
  includeLevelIds?: string;
  isRanked?: string;
  maxDifficulty?: string;
  maxDimension1?: string;
  maxDimension2?: string;
  maxNumberPerAuthor?: string;
  maxRating?: string;
  maxSteps?: string;
  minDifficulty?: string;
  minDimension1?: string;
  minDimension2?: string;
  minRating?: string;
  minSteps?: string;
  numResults?: string;
  page?: string;
  search?: string;
  searchAuthor?: string;
  searchAuthorId?: string;
  sortBy: string;
  sortDir: 'desc' | 'asc';
  statFilter?: StatFilter;
  timeRange: string;
}

const DefaultQuery = {
  blockFilter: String(BlockFilterMask.NONE),
  difficultyFilter: '',
  isRanked: 'false',
  maxDimension1: '',
  maxDimension2: '',
  maxSteps: '2500',
  minDimension1: '',
  minDimension2: '',
  minSteps: '1',
  page: '1',
  search: '',
  searchAuthor: '',
  searchAuthorId: '',
  sortBy: 'reviewScore',
  sortDir: 'desc',
  statFilter: StatFilter.All,
  timeRange: TimeRange[TimeRange.Month],
} as SearchQuery;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const searchQuery: SearchQuery = { ...DefaultQuery };
  const gameId = getGameIdFromReq(context.req);

  if (context.query && (Object.keys(context.query).length > 0)) {
    for (const q in context.query as SearchQuery) {
      searchQuery[q] = context.query[q];
    }
  }

  const query = await doQuery(gameId, searchQuery, reqUser);

  if (!query) {
    throw new Error('Error querying Levels');
  }

  return {
    props: {
      enrichedLevels: JSON.parse(JSON.stringify(query.levels)),
      reqUser: JSON.parse(JSON.stringify(reqUser)),
      searchAuthor: JSON.parse(JSON.stringify(query.searchAuthor)),
      searchQuery: searchQuery,
      totalRows: query.totalRows,
    } as SearchProps,
  };
}

interface TimeRangeMenuProps {
  onTimeRangeClick: (timeRangeKey: string) => void;
  timeRange: string;
}
const timeRangeStrings = {
  [TimeRange[TimeRange.Day]]: 'Today',
  [TimeRange[TimeRange.Week]]: 'This Week',
  [TimeRange[TimeRange.Month]]: 'This Month',
  [TimeRange[TimeRange.Year]]: 'This Year',
  [TimeRange[TimeRange.All]]: 'All Time',
};
const statFilterStrings = {
  [StatFilter.All]: 'Filter by...',
  [StatFilter.HideSolved]: 'Hide Solved',
  [StatFilter.HideCompleted]: 'Hide Completed',
  [StatFilter.Solved]: 'Solved',
} as Record<string, string>;

const filterStringAll = {
  ...statFilterStrings,
  ...timeRangeStrings,
  ...{
    [StatFilter.Completed]: 'Completed',
    [StatFilter.Unattempted]: 'Unattempted',
    'calc_stats_players_beaten': 'Solves',
    'maxSteps': 'Max Steps',
    'minSteps': 'Min Steps',
  },
} as Record<string, string>;

/* istanbul ignore next */
function getFilterDisplay(game: Game, filter: string, query: SearchQuery) {
  const difficultyType = game.type === GameType.SHORTEST_PATH ? 'Solve' : 'Completion';
  const otherDifficultyType = game.type === GameType.SHORTEST_PATH ? 'Completion' : 'Solve';

  if (filter === 'maxDimension1') {
    return `Max width: ${query.maxDimension1}`;
  } else if (filter === 'minDimension1') {
    return `Min width: ${query.minDimension1}`;
  } else if (filter === 'maxDimension2') {
    return `Max height: ${query.maxDimension2}`;
  } else if (filter === 'minDimension2') {
    return `Min height: ${query.minDimension2}`;
  } else if (filter === 'blockFilter') {
    return {
      '7': 'Maze levels',
      '6': 'No restricted blocks or holes',
      '5': 'Maze levels',
      '4': 'No restricted blocks',
      '3': 'Only restricted blocks',
      '2': 'No holes',
      '1': 'No blocks',
    }[query.blockFilter as string] || query.blockFilter;
  } else if (filter === 'minSteps') {
    return `Min Steps: ${query.minSteps}`;
  } else if (filter === 'maxSteps') {
    return `Max Steps: ${query.maxSteps}`;
  } else if (filter === 'isRanked') {
    return query.isRanked === 'true' ? 'Ranked' : 'Unranked';
  } else if (filter === 'searchAuthor') {
    return `Author: ${query.searchAuthor}`;
  } else if (filter === 'search') {
    return `Level name: ${query.search}`;
  } else if (filter === 'sortBy') {
    if (query[filter] === 'userId') {
      return 'Sort by author name';
    } else if (query[filter] === 'name') {
      return 'Sort by level name';
    } else if (query[filter] === 'calcDifficultyEstimate') {
      return 'Sort by ' + difficultyType.toLowerCase() + ' difficulty';
    } else if (query[filter] === 'calcOtherDifficultyEstimate') {
      return 'Sort by ' + otherDifficultyType.toLowerCase() + ' difficulty';
    } else if (query[filter] === 'ts') {
      return 'Sort by date created';
    } else if (query[filter] === 'leastMoves') {
      return 'Sort by minimum steps';
    }

    return 'Sort by: ' + query[filter];
  } else if (filter === 'sortDir') {
    return query[filter];
  }

  return filterStringAll[query[filter] as string] || query[filter];
}

/* istanbul ignore next */
function TimeRangeMenu({ onTimeRangeClick, timeRange }: TimeRangeMenuProps) {
  return (
    <Menu as='div' className='relative inline-block text-left'>
      <MenuButton
        className='flex items-center justify-center rounded px-3 py-2 text-sm font-medium gap-2 border border-gray-300  transition-colors'
      >
        <span>{timeRangeStrings[timeRange]}</span>
        <svg className='h-4 w-4' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
          <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
        </svg>
      </MenuButton>
      <Transition
        as={Fragment}
        enter='transition ease-out duration-100'
        enterFrom='transform opacity-0 scale-95'
        enterTo='transform opacity-100 scale-100'
        leave='transition ease-in duration-75'
        leaveFrom='transform opacity-100 scale-100'
        leaveTo='transform opacity-0 scale-95'
      >
        <MenuItems className='absolute right-0 z-10 mt-1 rounded overflow-hidden border shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border-color-1' style={{ backgroundColor: 'var(--bg-color)' }}>
          <div>
            {Object.keys(timeRangeStrings).map(timeRangeKey => (
              <MenuItem key={`time-range-${timeRangeKey}`}>
                <button
                  className='p-3 text-sm w-32 hover:bg-gray-700 text-left'
                  onClick={() => onTimeRangeClick(timeRangeKey)}
                >
                  {timeRangeStrings[timeRangeKey]}
                </button>
              </MenuItem>
            ))}
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  );
}

interface StatFilterMenuProps {
  onStatFilterClick: (statFilterKey: StatFilter) => void;
  query: SearchQuery;
}

/* istanbul ignore next */
function StatFilterMenu({ onStatFilterClick, query }: StatFilterMenuProps) {
  const { game } = useContext(AppContext);

  if (query.sortBy !== 'completed') {
    statFilterStrings[StatFilter.Completed] = 'Completed';
    statFilterStrings[StatFilter.Unoptimized] = 'Unoptimized';
    statFilterStrings[StatFilter.Unattempted] = 'Unattempted';
  }

  const quickFilter = game.type === GameType.SHORTEST_PATH ? StatFilter.HideSolved : StatFilter.HideCompleted;
  const quickFilterLabel = game.type === GameType.SHORTEST_PATH ? 'Hide Solved' : 'Hide Completed';

  return (
    <div className='flex items-center gap-2'>
      <label className='flex items-center gap-2 cursor-pointer px-3 py-2 border border-gray-300 rounded transition-colors'>
        <input
          checked={query.statFilter === quickFilter}
          onChange={() => {
            onStatFilterClick(query.statFilter === quickFilter ? StatFilter.All : quickFilter);
          }}
          type='checkbox'
          className='rounded border-gray-300 text-blue-600 focus:ring-0 focus:ring-offset-0'
        />
        <span className='text-sm font-medium whitespace-nowrap'>{quickFilterLabel}</span>
      </label>
      <Menu as='div' className='relative inline-block text-left'>
        <MenuButton
          className='flex items-center justify-center rounded px-3 py-2 text-sm font-medium gap-2 border border-gray-300 hover:bg-gray-700 transition-colors'
        >
          <span>{query.statFilter && query.statFilter !== quickFilter && query.statFilter in statFilterStrings ? statFilterStrings[query.statFilter] : 'Filter by...'}</span>
          <svg className='h-4 w-4' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
            <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
          </svg>
        </MenuButton>
        <Transition
          as={Fragment}
          enter='transition ease-out duration-100'
          enterFrom='transform opacity-0 scale-95'
          enterTo='transform opacity-100 scale-100'
          leave='transition ease-in duration-75'
          leaveFrom='transform opacity-100 scale-100'
          leaveTo='transform opacity-0 scale-95'
        >
          <MenuItems className='absolute right-0 z-10 mt-1 rounded overflow-hidden border shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border-color-1' style={{ backgroundColor: 'var(--bg-color)' }}>
            <div>
              {Object.entries(statFilterStrings)
                .filter(([key]) => key !== quickFilter) // Exclude the quick filter from dropdown
                .map(([statFilterKey, label]) => (
                  <MenuItem key={`filter-completions-${statFilterKey}`}>
                    <button
                      className='p-3 text-sm w-36 hover:bg-gray-700 text-left'
                      onClick={() => onStatFilterClick(statFilterKey as StatFilter)}
                    >
                      {label}
                    </button>
                  </MenuItem>
                ))}
            </div>
          </MenuItems>
        </Transition>
      </Menu>
    </div>
  );
}

interface SearchProps {
  enrichedLevels: EnrichedLevel[];
  reqUser: User;
  searchAuthor: User | null;
  searchQuery: SearchQuery;
  totalRows: number;
}

/* istanbul ignore next */
export default function Search({ enrichedLevels, reqUser, searchAuthor, searchQuery, totalRows }: SearchProps) {
  const [data, setData] = useState<EnrichedLevel[]>(enrichedLevels);
  const { game, setTempCollection } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(searchQuery);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const router = useRouter();
  const routerQuery = useRouterQuery();
  const difficultyType = game.type === GameType.SHORTEST_PATH ? 'Solve' : 'Completion';
  const otherDifficultyType = game.type === GameType.SHORTEST_PATH ? 'Completion' : 'Solve';
  const difficultyField = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_completion_estimate' : 'calc_difficulty_estimate';
  const otherDifficultyField = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_estimate' : 'calc_difficulty_completion_estimate';

  useEffect(() => {
    // focus default-search
    document.getElementById('default-search')?.focus();
  }, []);
  useEffect(() => {
    setData(enrichedLevels);
    setLoading(false);
  }, [enrichedLevels]);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  // Auto-show advanced filters if any are active (only on initial load)
  useEffect(() => {
    const hasAdvancedFilters = query.minDimension1 || query.maxDimension1 || query.minDimension2 || query.maxDimension2 ||
      query.blockFilter !== DefaultQuery.blockFilter || query.minSteps !== DefaultQuery.minSteps ||
      query.maxSteps !== DefaultQuery.maxSteps;

    // Only auto-show on initial load, don't force it to stay open
    if (hasAdvancedFilters && !showAdvancedFilters && query === searchQuery) {
      setShowAdvancedFilters(true);
    }
  }, [query, searchQuery, showAdvancedFilters]); // Only depend on searchQuery (initial load)

  const fetchLevels = useCallback((query: SearchQuery) => {
    // TODO: check if query is identical, in which case do nothing

    nProgress.start();
    setQuery(query);
    setLoading(true);
    routerQuery(query, DefaultQuery);
  }, [routerQuery]);

  const filtersSelected = [];

  for (const key in query) {
    if (key === 'subdomain') { continue; }

    if (query[key] && query[key] !== DefaultQuery[key]) {
      filtersSelected.push(key);
    }
  }

  const queryHelper = useCallback((update: Partial<SearchQuery>) => {
    setQuery(q => {
      if (loading) {
        return q;
      }

      const newQ = {
        ...q,
        ...update,
      } as SearchQuery;

      fetchLevels(newQ);

      return newQ;
    });
  }, [fetchLevels, loading]);

  const columns: TableColumn<EnrichedLevel>[] = [
    {
      id: 'userId',
      name: 'Author',
      selector: (row: EnrichedLevel) => (
        <div className='flex gap-3 truncate'>
          <PlayLaterToggleButton id={row._id.toString()} level={row} />
          <button
            onClick={() => {
              if (query.searchAuthor === row.userId.name) {
                fetchLevels({
                  ...query,
                  searchAuthor: '',
                });
              } else {
                fetchLevels({
                  ...query,
                  searchAuthor: row.userId.name,
                });
              }
            }}
            style={{
              display: query.searchAuthor ? 'none' : 'block',
            }}
          >
            <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-filter' viewBox='0 0 16 16'>
              <path d='M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z' />
            </svg>
          </button>
          <FormattedUser id='search' size={Dimensions.AvatarSizeSmall} user={row.userId} />
        </div>
      ),
      sortable: true,
      style: {
        minWidth: '225px',
      },
    },
    {
      id: 'name',
      name: 'Name',
      selector: (row: EnrichedLevel) => (
        <div className='flex items-center gap-2 truncate'>
          <FormattedLevelLink onClick={() => {
            const ts = new Date();

            // convert router.query to a querystring ?var=1&var=2
            const queryString = Object.keys(router.query).map(key => {
              if (key === 'subdomain') { return; }

              return `${key}=${router.query[key]}`;
            }).filter(Boolean).join('&');

            // TODO: temp collection is a hack (doesn't represent a real collection so there are other UX problems)
            // should make a new collection class to be used on the level page (with an href property, isInMemory, etc.)

            const collectionTemp = {
              createdAt: ts,
              isPrivate: true,
              levels: data, _id: new Types.ObjectId(),
              name: 'Search',
              slug: `/search${queryString.length > 0 ? `?${queryString}` : ''}`,
              type: CollectionType.InMemory,
              updatedAt: ts,
              userId: { _id: new Types.ObjectId() } as Types.ObjectId & User,
            } as EnrichedCollection;

            sessionStorage.setItem('tempCollection', JSON.stringify(collectionTemp));
            setTempCollection(collectionTemp);
          }} id='search' level={row} />
          {row.isRanked &&
            <div className='text-yellow-500 text-base'>
              <Link
                data-tooltip-content='Ranked level'
                data-tooltip-id={`ranked-tooltip-${row._id.toString()}`}
                href='/ranked'
              >
                🏅
              </Link>
              <StyledTooltip id={`ranked-tooltip-${row._id.toString()}`} />
            </div>
          }
        </div>
      ),
      sortable: true,
      style: {
        minWidth: '150px',
      },
    },
    {
      id: 'calcDifficultyEstimate',
      name: <span className='text-xs md:text-md'>{difficultyType + ' Difficulty'}</span>,
      selector: (row: EnrichedLevel) => (
        <FormattedDifficulty id='search-row' level={row} difficultyField={difficultyField} />
      ),
      sortable: true,
      style: {
        fontSize: '13px',
        minWidth: '178px',
      },
    },
    ...(isPro(reqUser) ?
      [{
        id: 'calcOtherDifficultyEstimate',
        name: <div className='flex gap-1 flex-row align-center items-center'><span className='text-xs md:text-md'>{otherDifficultyType + ' Difficulty'}</span><Image alt='pro' className='mr-0.5' src='/pro.svg' width='16' height='16' /></div>,
        selector: (row: EnrichedLevel) => (
          <FormattedDifficulty id='search-row-other' level={row} difficultyField={otherDifficultyField} />
        ),
        style: {
          fontSize: '13px',
          minWidth: '178px',
        },
        sortable: isPro(reqUser),
      }] : []),
    {
      id: 'ts',
      name: 'Created',
      selector: (row: EnrichedLevel) => <FormattedDate style={{ color: 'var(--color)', fontSize: 13 }} ts={row.ts} />,
      sortable: true,
    },
    {
      id: 'leastMoves',
      name: 'Steps',
      selector: (row: EnrichedLevel) => `${row.userMoves !== undefined && row.userMoves !== row.leastMoves ? `${row.userMoves}/` : ''}${row.leastMoves}`,
      sortable: true,
      style: {
        minWidth: '80px',
      }
    },
    {
      id: 'solves',
      name: 'Solves',
      selector: (row: EnrichedLevel) => row.calc_stats_players_beaten || 0,
      sortable: true,
      style: {
        minWidth: '80px',
      }
    },
    {
      id: 'reviewScore',
      name: 'Rating',
      selector: (row: EnrichedLevel) => {
        if (row.calc_reviews_count === 0 || !row.calc_reviews_score_laplace) {
          return '-';
        }

        // floor to avoid showing review scores that are too high
        // eg: .908 would show .91 if it was rounded, but it would not contribute
        // to the acclaimed levels achievement (requires >= 0.91)
        return (100 * Math.floor(row.calc_reviews_score_laplace * 1000) / 1000).toFixed(1);
      },
      sortable: true,
      style: {
        minWidth: '80px',
      }
    },
    ...(!reqUser ? [] : [{
      id: 'completed',
      style: {
        minWidth: '132px',
      },
      name: (
        <div className='flex gap-1 items-center align-center'>
          <span>Completed</span>
          <Image alt='pro' className='mr-0.5' src='/pro.svg' width='16' height='16' />
        </div>
      ),
      selector: (row: EnrichedLevel) => !row.userMovesTs ? '-' : <FormattedDate style={{ color: 'var(--color)', fontSize: 13 }} ts={row.userMovesTs} />,
      sortable: isPro(reqUser),
    }]),
  ];

  const onTimeRangeClick = useCallback((timeRangeKey: string) => {
    fetchLevels({
      ...query,
      page: '1',
      timeRange: query.timeRange === timeRangeKey ? TimeRange[TimeRange.Month] : timeRangeKey,
    });
  }, [fetchLevels, query]);

  const timeRangeButtons = [];

  for (const timeRangeKey in TimeRange) {
    if (isNaN(Number(timeRangeKey))) {
      timeRangeButtons.push(
        <button
          className={classNames(
            'px-3 py-2.5 text-white font-medium text-xs leading-tight hover:bg-blue-700 active:bg-blue-800 transition duration-150 ease-in-out',
            query.timeRange === timeRangeKey ? 'bg-blue-800' : 'bg-blue-600',
            timeRangeKey === TimeRange[TimeRange.Day] ? 'rounded-tl-lg rounded-bl-lg' : undefined,
            timeRangeKey === TimeRange[TimeRange.All] ? 'rounded-tr-lg rounded-br-lg' : undefined,
          )}
          key={`time-range-${timeRangeKey}`}
          onClick={() => onTimeRangeClick(timeRangeKey)}
        >
          {timeRangeKey}
        </button>
      );
    }
  }

  const onBlockFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // XOR to flip masking bit
    fetchLevels({
      ...query,
      page: '1',
      blockFilter: String(Number(query.blockFilter) ^ Number(e.currentTarget.value)),
    });
  };

  const onStatFilterClick = useCallback((statFilterKey: StatFilter) => {
    fetchLevels({
      ...query,
      page: '1',
      statFilter: query.statFilter === statFilterKey ? StatFilter.All : statFilterKey,
    });
  }, [fetchLevels, query]);

  const difficulty = difficultyList.find(d => d.name === query.difficultyFilter);

  // Check if any advanced filters are active
  const hasAdvancedFilters = query.minDimension1 || query.maxDimension1 || query.minDimension2 || query.maxDimension2 ||
    query.blockFilter !== DefaultQuery.blockFilter || query.minSteps !== DefaultQuery.minSteps ||
    query.maxSteps !== DefaultQuery.maxSteps;

  const subHeaderComponent = (
    <div className='p-2 sm:p-4 space-y-2 sm:space-y-3' id='level_search_box'>
      {/* Main Search Bar */}
      <div className='p-2 sm:p-3 w-full'>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);

          queryHelper({
            search: formData.get('search') as string || '',
            page: '1',
          });
        }}>
          <div className='flex flex-col sm:flex-row gap-2 items-stretch sm:items-center'>
            <div className='flex-1 relative'>
              <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                <SearchIcon className='h-4 w-4 text-gray-400' />
              </div>
              <input
                id='default-search'
                name='search'
                key='search-level-input'
                placeholder='Level name...'
                type='search'
                defaultValue={query.search}
                onChange={(e) => {
                  // Auto-switch to "All Time" when user starts typing
                  if (e.target.value && query.timeRange !== TimeRange[TimeRange.All]) {
                    queryHelper({
                      timeRange: TimeRange[TimeRange.All],
                    });
                  }
                }}
                className='w-full pl-10 pr-3 py-2 text-base border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>
            <div className='w-full sm:w-48 flex-shrink-0'>
              <MultiSelectUser
                key={'search-author-input-' + searchAuthor?._id.toString()}
                placeholder='Author...'
                defaultValue={searchAuthor}
                onSelect={(user) => {
                  queryHelper({
                    searchAuthor: user?.name || '',
                  });
                }}
              />
            </div>
            <button
              type='submit'
              className='flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors whitespace-nowrap mt-3 md:mt-0 sm:pt-2'
            >
              <SearchIcon className='h-4 w-4' />
              Search
            </button>
          </div>
        </form>
      </div>
      {/* Quick Filters */}
      <div className='p-2'>
        <div className='flex flex-wrap gap-2 items-center justify-center text-sm'>
          {reqUser && <StatFilterMenu onStatFilterClick={onStatFilterClick} query={query} />}
          <Menu as='div' className='relative inline-block text-left'>
            <MenuButton
              className='flex items-center justify-center rounded px-3 py-2 text-sm font-medium gap-2 border border-gray-300 transition-colors'
              style={{
                backgroundColor: difficulty ? getDifficultyColor(difficulty.name === 'Pending' ? -1 : difficulty.value * 1.5 + 30, 70) : undefined,
                color: 'black',
              }}
            >
              {!difficulty ? (
                <span className='text-white'>All {difficultyType} Difficulties</span>
              ) : (
                <>
                  <span>{difficulty.emoji}</span>
                  <span >{difficulty.name}</span>
                </>
              )}
              <svg className='h-4 w-4' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
                <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
              </svg>
            </MenuButton>
            <Transition
              as={Fragment}
              enter='transition ease-out duration-100'
              enterFrom='transform opacity-0 scale-95'
              enterTo='transform opacity-100 scale-100'
              leave='transition ease-in duration-75'
              leaveFrom='transform opacity-100 scale-100'
              leaveTo='transform opacity-0 scale-95'
            >
              <MenuItems className='absolute right-0 z-10 mt-1 rounded overflow-hidden border shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border-color-1' style={{ backgroundColor: 'var(--bg-color)' }}>
                <div>
                  <MenuItem>
                    <button
                      className='block p-3 text-sm w-48 hover:bg-gray-700 text-left'
                      onClick={() => fetchLevels({
                        ...query,
                        difficultyFilter: '',
                        page: '1',
                      })}
                    >
                      All {difficultyType} Difficulties
                    </button>
                  </MenuItem>
                  <MenuItem>
                    <button
                      className='p-3 text-sm w-48 flex items-center gap-2 hover:bg-gray-700'
                      onClick={() => fetchLevels({
                        ...query,
                        difficultyFilter: 'Pending',
                        page: '1',
                      })}
                    >
                      <span>⏳</span>
                      <span>Pending</span>
                    </button>
                  </MenuItem>
                  {difficultyList.filter(difficulty => difficulty.name !== 'Pending').map((difficulty) => (
                    <MenuItem key={`difficulty-item-${difficulty.value}`}>
                      {({ focus }) => (
                        <button
                          className='p-3 text-sm w-48 flex items-center gap-2'
                          onClick={() => fetchLevels({
                            ...query,
                            difficultyFilter: difficulty.name,
                            page: '1',
                          })}
                          style={{
                            backgroundColor: getDifficultyColor(difficulty.value * 1.5 + 30, focus ? 50 : 70),
                            color: 'black',
                          }}
                        >
                          <span>{difficulty.emoji}</span>
                          <span>{difficulty.name}</span>
                        </button>
                      )}
                    </MenuItem>
                  ))}
                </div>
              </MenuItems>
            </Transition>
          </Menu>
          <TimeRangeMenu onTimeRangeClick={onTimeRangeClick} timeRange={query.timeRange} />
          {/* Ranked Toggle */}
          {!game.disableRanked && (
            <label className='flex items-center gap-2 cursor-pointer px-3 py-2 border border-gray-300 rounded transition-colors'>
              <input
                checked={query.isRanked === 'true'}
                onChange={() => {
                  fetchLevels({
                    ...query,
                    isRanked: query.isRanked === 'true' ? 'false' : 'true',
                    page: '1',
                    timeRange: TimeRange[TimeRange.All],
                  });
                }}
                type='checkbox'
                className='rounded border-gray-300 text-blue-600 focus:ring-0 focus:ring-offset-0'
              />
              <span className='text-sm font-medium whitespace-nowrap'>🏅 Ranked</span>
            </label>
          )}
          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded border transition-colors ${
              showAdvancedFilters || hasAdvancedFilters
                ? 'border-blue-300 text-blue-300'
                : 'border-gray-300 '
            }`}
          >
            <svg className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
            </svg>
            Advanced
            {hasAdvancedFilters && !showAdvancedFilters && (
              <span className='bg-blue-300 text-black text-xs rounded-full px-2 py-0.5'>
                Active
              </span>
            )}
          </button>
        </div>
      </div>
      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className='p-3 border-t border-gray-200'>
          <h3 className='text-lg font-semibold mb-3'>Advanced Filters</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);

            queryHelper({
              minSteps: formData.get('minSteps') as string,
              maxSteps: formData.get('maxSteps') as string,
              minDimension1: formData.get('minDimension1') as string,
              minDimension2: formData.get('minDimension2') as string,
              maxDimension1: formData.get('maxDimension1') as string,
              maxDimension2: formData.get('maxDimension2') as string,
              page: '1',
            });
          }}>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Steps Range */}
              <div className='space-y-2'>
                <label className='block text-sm font-medium'>Steps Range</label>
                <div className='flex items-center gap-2'>
                  <input
                    className='w-20 text-sm px-2 py-1 border border-gray-300 rounded'
                    placeholder='Min'
                    max='2500'
                    min='1'
                    name='minSteps'
                    step='1'
                    type='number'
                    defaultValue={query.minSteps}
                  />
                  <span className='text-gray-500'>to</span>
                  <input
                    className='w-20 text-sm px-2 py-1 border border-gray-300 rounded'
                    placeholder='Max'
                    max='2500'
                    min='1'
                    name='maxSteps'
                    step='1'
                    type='number'
                    defaultValue={query.maxSteps}
                  />
                </div>
              </div>
              {/* Pro Features */}
              {isPro(reqUser) ? (
                <>
                  {/* Dimensions */}
                  <div className='space-y-2'>
                    <label className='block text-sm font-medium flex items-center gap-2'>
                      Dimensions
                      <Image alt='pro' src='/pro.svg' width='16' height='16' />
                    </label>
                    <div className='flex items-center gap-2 text-sm'>
                      <input
                        className='w-12 px-2 py-1 border border-gray-300 rounded text-center'
                        placeholder='Min W'
                        max='40'
                        min='1'
                        name='minDimension1'
                        step='1'
                        type='number'
                        defaultValue={query.minDimension1}
                      />
                      <span>×</span>
                      <input
                        className='w-12 px-2 py-1 border border-gray-300 rounded text-center'
                        placeholder='Min H'
                        max='40'
                        min='1'
                        name='minDimension2'
                        step='1'
                        type='number'
                        defaultValue={query.minDimension2}
                      />
                      <span className='text-gray-500'>to</span>
                      <input
                        className='w-12 px-2 py-1 border border-gray-300 rounded text-center'
                        placeholder='Max W'
                        max='40'
                        min='1'
                        name='maxDimension1'
                        step='1'
                        type='number'
                        defaultValue={query.maxDimension1}
                      />
                      <span>×</span>
                      <input
                        className='w-12 px-2 py-1 border border-gray-300 rounded text-center'
                        placeholder='Max H'
                        max='40'
                        min='1'
                        name='maxDimension2'
                        step='1'
                        type='number'
                        defaultValue={query.maxDimension2}
                      />
                    </div>
                  </div>
                  {/* Block Types */}
                  <div className='space-y-2'>
                    <label className='block text-sm font-medium flex items-center gap-2'>
                      Block Types
                      <Image alt='pro' src='/pro.svg' width='16' height='16' />
                    </label>
                    <div className='flex items-center gap-2'>
                      <FilterButton
                        element={
                          <span style={{
                            backgroundColor: 'var(--level-block)',
                            borderColor: 'var(--level-block-border)',
                            borderWidth: 2,
                            display: 'block',
                            height: 16,
                            width: 16,
                          }} />
                        }
                        first={true}
                        onClick={onBlockFilterClick}
                        proRequired={false}
                        selected={(Number(query.blockFilter) & BlockFilterMask.BLOCK) !== BlockFilterMask.NONE}
                        transparent={true}
                        value={BlockFilterMask.BLOCK.toString()}
                      />
                      <FilterButton
                        element={
                          <span style={{
                            backgroundColor: 'var(--level-block)',
                            borderColor: 'var(--level-block-border)',
                            borderWidth: '2px 0',
                            display: 'block',
                            height: 16,
                            width: 16,
                          }} />
                        }
                        onClick={onBlockFilterClick}
                        proRequired={false}
                        selected={(Number(query.blockFilter) & BlockFilterMask.RESTRICTED) !== BlockFilterMask.NONE}
                        transparent={true}
                        value={BlockFilterMask.RESTRICTED.toString()}
                      />
                      <FilterButton
                        element={
                          <span style={{
                            backgroundColor: 'var(--level-hole)',
                            borderColor: 'var(--level-hole-border)',
                            borderWidth: 2,
                            display: 'block',
                            height: 16,
                            width: 16,
                          }} />
                        }
                        last={true}
                        onClick={onBlockFilterClick}
                        proRequired={false}
                        selected={(Number(query.blockFilter) & BlockFilterMask.HOLE) !== BlockFilterMask.NONE}
                        transparent={true}
                        value={BlockFilterMask.HOLE.toString()}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className='text-center py-4'>
                  <div className='flex items-center justify-center gap-2 text-gray-500 mb-2'>
                    <Image alt='pro' src='/pro.svg' width='20' height='20' />
                    <span className='text-sm'>More filters available with Pro</span>
                  </div>
                  <Link href='/pro' className='text-blue-600 hover:text-blue-800 underline text-sm'>
                    Upgrade to Pro
                  </Link>
                </div>
              )}
            </div>
            <div className='mt-4 flex justify-end'>
              <button
                type='submit'
                className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
              >
                Apply Filters
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Active Filters */}
      {filtersSelected.length > 0 && (
        <div className='p-2 border-t border-gray-200'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-sm font-medium'>Active filters:</span>
            {filtersSelected.map((filter, i) => (
              <div className='flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-800' key={`filter-${i}`}>
                <span>{getFilterDisplay(game, filter, query)}</span>
                <button
                  className='ml-1 text-blue-600 hover:text-blue-800 font-bold'
                  onClick={() => {
                    const update = {
                      [filter]: DefaultQuery[filter],
                    } as Partial<SearchQuery>;

                    if (filter === 'statFilter') {
                      update.statFilter = StatFilter.All;
                    }

                    fetchLevels({
                      ...query,
                      ...update,
                    });
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className='text-sm text-gray-300 hover:text-gray-500 underline'
              onClick={() => fetchLevels(DefaultQuery)}
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (<>
    <NextSeo
      title={'Search - ' + game.displayName}
      canonical={game.baseUrl + '/search'}
      openGraph={{
        title: 'Search - ' + game.displayName,
        type: 'article',
        url: '/search',
      }}
    />
    <Page title={'Search'}>
      <>
        {subHeaderComponent}
        <DataTable
          columns={columns}
          data={data}
          itemsPerPage={20}
          noDataComponent={
            <div className='flex flex-col items-center p-3 gap-3'>
              <span>No levels found...</span>
              {query.timeRange !== TimeRange[TimeRange.All] &&
                <span>
                  Try <button className='underline' onClick={() => { onTimeRangeClick(TimeRange[TimeRange.All]); }}>expanding</button> the time range.
                </span>
              }
            </div>
          }
          onChangePage={(pg: number) => {
            fetchLevels({
              ...query,
              page: String(pg),
            });
          }}
          onSort={(columnId: string) => {
            const sortAsc = columnId === 'userId' || columnId === 'name';

            const update = {
              sortBy: columnId,
              // default to most useful sort direction
              sortDir: sortAsc ? 'asc' : 'desc',
            } as Partial<SearchQuery>;

            if (columnId === query.sortBy) {
              // swap sortDir if the same col is clicked
              update.sortDir = query.sortDir === 'desc' ? 'asc' : 'desc';
            }

            // move off of invalid stat filter option when sorting by completed
            if (columnId === 'completed' && (query.statFilter === StatFilter.Completed || query.statFilter === StatFilter.Unattempted)) {
              update.statFilter = StatFilter.All;
            }

            fetchLevels({
              ...query,
              ...update,
            });
          }}
          page={Number(query.page ?? '1')}
          sortBy={query.sortBy}
          sortDir={query.sortDir}
          totalItems={totalRows}
        />
        <div className='text-sm text-gray-500 text-center p-4'>
          <p>Note: This page updates every few minutes, so you might see slightly different results if you refresh.</p>
          <p>This helps us keep the site running smoothly for everyone!</p>
        </div>
      </>
    </Page>
  </>);
}
