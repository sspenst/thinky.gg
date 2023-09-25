import { Menu, Transition } from '@headlessui/react';
import FormattedDate from '@root/components/formatted/formattedDate';
import FormattedUser from '@root/components/formatted/formattedUser';
import DataTable, { TableColumn } from '@root/components/tables/dataTable';
import Dimensions from '@root/constants/dimensions';
import StatFilter from '@root/constants/statFilter';
import isPro from '@root/helpers/isPro';
import classNames from 'classnames';
import { debounce } from 'debounce';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import nProgress from 'nprogress';
import { ParsedUrlQuery, ParsedUrlQueryInput } from 'querystring';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import FilterButton from '../../components/buttons/filterButton';
import FormattedDifficulty, { difficultyList, getDifficultyColor } from '../../components/formatted/formattedDifficulty';
import FormattedLevelLink from '../../components/formatted/formattedLevelLink';
import MultiSelectUser from '../../components/page/multiSelectUser';
import Page from '../../components/page/page';
import TimeRange from '../../constants/timeRange';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import { EnrichedLevel } from '../../models/db/level';
import User from '../../models/db/user';
import { doQuery } from '../api/search';

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
  maxDifficulty?: string;
  maxDimension1?: string;
  maxDimension2?: string;
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
  timeRange: TimeRange[TimeRange.All],
} as SearchQuery;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const searchQuery = { ...DefaultQuery };

  if (context.query && (Object.keys(context.query).length > 0)) {
    for (const q in context.query as SearchQuery) {
      searchQuery[q] = context.query[q];
    }
  }

  const query = await doQuery(searchQuery, reqUser);

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

function TimeRangeMenu({ onTimeRangeClick, timeRange }: TimeRangeMenuProps) {
  const timeRangeStrings = {
    [TimeRange[TimeRange.Day]]: 'Today',
    [TimeRange[TimeRange.Week]]: 'This Week',
    [TimeRange[TimeRange.Month]]: 'This Month',
    [TimeRange[TimeRange.Year]]: 'This Year',
    [TimeRange[TimeRange.All]]: 'All Time',
  };

  return (
    <Menu as='div' className='relative inline-block text-left'>
      <Menu.Button
        aria-expanded='true'
        aria-haspopup='true'
        className='flex items-center w-full justify-center rounded-md bg-white pl-2 pr-1 text-sm font-medium text-black gap-1 h-8 shadow-md border'
        id='menu-button'
        style={{
          borderColor: 'var(--bg-color-3)',
        }}
      >
        <span>{timeRangeStrings[timeRange]}</span>
        <svg className='h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
          <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
        </svg>
      </Menu.Button>
      <Transition
        as={Fragment}
        enter='transition ease-out duration-100'
        enterFrom='transform opacity-0 scale-95'
        enterTo='transform opacity-100 scale-100'
        leave='transition ease-in duration-75'
        leaveFrom='transform opacity-100 scale-100'
        leaveTo='transform opacity-0 scale-95'
      >
        <Menu.Items className='absolute right-0 z-10 mt-1 rounded-md overflow-hidden border bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none' style={{
          borderColor: 'var(--bg-color)',
        }}>
          <div>
            {Object.keys(timeRangeStrings).map(timeRangeKey => (
              <Menu.Item key={`time-range-${timeRangeKey}`}>
                {({ active }) => (
                  <button
                    className='text-black block p-1 text-sm w-24 flex items-center gap-1 justify-center'
                    onClick={() => onTimeRangeClick(timeRangeKey)}
                    role='menuitem'
                    style= {{
                      backgroundColor: active ? 'rgb(200, 200, 200)' : '',
                    }}
                  >
                    {timeRangeStrings[timeRangeKey]}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

interface StatFilterMenuProps {
  onStatFilterClick: (statFilterKey: StatFilter) => void;
  statFilter?: StatFilter;
}

function StatFilterMenu({ onStatFilterClick, statFilter }: StatFilterMenuProps) {
  const statFilterStrings = {
    [StatFilter.All]: 'All Levels',
    [StatFilter.HideWon]: 'Hide Won',
    [StatFilter.ShowWon]: 'Show Won',
    [StatFilter.ShowInProgress]: 'Show In Progress',
    [StatFilter.ShowUnattempted]: 'Show Unattempted',
  } as Record<string, string>;

  return (
    <Menu as='div' className='relative inline-block text-left'>
      <Menu.Button
        aria-expanded='true'
        aria-haspopup='true'
        className='flex items-center w-full justify-center rounded-md bg-white pl-2 pr-1 text-sm font-medium text-black gap-1 h-8 shadow-md border'
        id='menu-button'
        style={{
          borderColor: 'var(--bg-color-3)',
        }}
      >
        <span>{statFilterStrings[statFilter ?? StatFilter.All]}</span>
        <svg className='h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
          <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
        </svg>
      </Menu.Button>
      <Transition
        as={Fragment}
        enter='transition ease-out duration-100'
        enterFrom='transform opacity-0 scale-95'
        enterTo='transform opacity-100 scale-100'
        leave='transition ease-in duration-75'
        leaveFrom='transform opacity-100 scale-100'
        leaveTo='transform opacity-0 scale-95'
      >
        <Menu.Items className='absolute right-0 z-10 mt-1 rounded-md overflow-hidden border bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none' style={{
          borderColor: 'var(--bg-color)',
        }}>
          <div>
            {Object.keys(statFilterStrings).map(statFilterKey => (
              <Menu.Item key={`filter-completions-${statFilterKey}`}>
                {({ active }) => (
                  <button
                    className='text-black block p-1 text-sm w-40 flex items-center gap-1 justify-center'
                    onClick={() => onStatFilterClick(statFilterKey as StatFilter)}
                    role='menuitem'
                    style= {{
                      backgroundColor: active ? 'rgb(200, 200, 200)' : '',
                    }}
                  >
                    {statFilterStrings[statFilterKey]}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
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
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(searchQuery);
  const router = useRouter();

  useEffect(() => {
    setData(enrichedLevels);
    setLoading(false);
  }, [enrichedLevels]);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  const fetchLevels = useCallback((query: SearchQuery) => {
    // TODO: check if query is identical, in which case do nothing

    nProgress.start();
    setQuery(query);
    setLoading(true);

    // only add non-default query params for a clean URL
    const q: ParsedUrlQueryInput = {};

    for (const prop in query) {
      if (query[prop] !== DefaultQuery[prop]) {
        q[prop] = query[prop];
      }
    }

    router.push({
      query: q,
    });
  }, [router]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queryDebounce = useCallback(
    debounce((q: SearchQuery) => {
      fetchLevels(q);
    }, 500),
    []
  );

  const queryDebounceHelper = useCallback((update: Partial<SearchQuery>) => {
    setQuery(q => {
      if (loading) {
        return q;
      }

      const newQ = {
        ...q,
        ...update,
      } as SearchQuery;

      queryDebounce(newQ);

      return newQ;
    });
  }, [loading, queryDebounce]);

  const columns = [
    {
      id: 'userId',
      name: 'Author',
      selector: (row: EnrichedLevel) => (
        <div className='flex gap-3 truncate'>
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
        minWidth: '150px',
      },
    },
    {
      id: 'name',
      name: 'Name',
      grow: 2,
      selector: (row: EnrichedLevel) => <FormattedLevelLink id='search' level={row} />,
      sortable: true,
      style: {
        minWidth: '150px',
      },
    },
    {
      id: 'calcDifficultyEstimate',
      name: 'Difficulty',
      selector: (row: EnrichedLevel) => (
        <FormattedDifficulty
          difficultyEstimate={row.calc_difficulty_estimate}
          id={row._id.toString()}
          uniqueUsers={row.calc_playattempts_unique_users_count}
        />
      ),
      sortable: true,
      allowOverflow: true,
      style: {
        fontSize: '13px',
        minWidth: '150px',
      },
    },
    {
      id: 'ts',
      name: 'Created',
      selector: (row: EnrichedLevel) => <FormattedDate style={{ color: 'var(--color)', fontSize: 13 }} ts={row.ts} />,
      sortable: true,
    },
    {
      grow: 0.45,
      id: 'leastMoves',
      name: 'Steps',
      selector: (row: EnrichedLevel) => `${row.userMoves !== undefined && row.userMoves !== row.leastMoves ? `${row.userMoves}/` : ''}${row.leastMoves}`,
      sortable: true,
    },
    {
      id: 'playersBeaten',
      name: 'Users Won',
      selector: (row: EnrichedLevel) => row.calc_stats_players_beaten || 0,
      sortable: true,
    },
    {
      id: 'reviewScore',
      name: 'Review Score',
      selector: (row: EnrichedLevel) => {
        if (row.calc_reviews_count === 0 || !row.calc_reviews_score_laplace) {
          return '-';
        }

        // floor to avoid showing review scores that are too high
        // eg: .908 would show .91 if it was rounded, but it would not contribute
        // to the acclaimed levels achievement (requires >= 0.91)
        return (Math.floor(row.calc_reviews_score_laplace * 1000) / 1000).toFixed(3);
      },
      sortable: true,
    },
    {
      id: 'completed',
      name: 'Completed',
      selector: (row: EnrichedLevel) => !row.userMovesTs ? '-' : <FormattedDate style={{ color: 'var(--color)', fontSize: 13 }} ts={row.userMovesTs} />,
      sortable: true,
    },
  ] as TableColumn<EnrichedLevel>[];

  const onTimeRangeClick = useCallback((timeRangeKey: string) => {
    fetchLevels({
      ...query,
      page: '1',
      timeRange: query.timeRange === timeRangeKey ? TimeRange[TimeRange.All] : timeRangeKey,
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

  const subHeaderComponent = (
    <div className='flex flex-col gap-1 p-1' id='level_search_box'>
      <div className='flex flex-row flex-wrap items-center justify-center z-10 gap-1'>
        <div>
          <input
            className='form-control relative min-w-0 block w-52 px-3 py-1.5 h-10 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded-md transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none'
            id='default-search'
            key='search-level-input'
            onChange={e => {
              queryDebounceHelper({
                search: e.target.value,
              });
            } }
            placeholder='Search level name...'
            type='search'
            value={query.search}
          />
        </div>
        <div>
          <MultiSelectUser key={'search-author-input-' + searchAuthor?._id.toString()} placeholder='Search authors...' defaultValue={searchAuthor} onSelect={(user) => {
            queryDebounceHelper({
              searchAuthor: user?.name || '',
            });
          }} />
        </div>
      </div>
      <div className='flex items-center justify-center flex-wrap gap-1'>
        {reqUser && <StatFilterMenu statFilter={query.statFilter} onStatFilterClick={onStatFilterClick} />}
        <Menu as='div' className='relative inline-block text-left'>
          <Menu.Button
            aria-expanded='true'
            aria-haspopup='true'
            className='flex items-center w-full justify-center rounded-md bg-white pl-2 pr-1 text-sm font-medium text-black gap-1 h-8 shadow-md border'
            id='menu-button'
            style={{
              backgroundColor: difficulty ? getDifficultyColor(difficulty.name === 'Pending' ? -1 : difficulty.value * 1.5 + 30, 70) : undefined,
              borderColor: 'var(--bg-color-3)',
            }}
          >
            {!difficulty ?
              <span>All Difficulties</span> :
              <>
                <span>{difficulty.emoji}</span>
                <span>{difficulty.name}</span>
              </>
            }
            <svg className='h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
              <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
            </svg>
          </Menu.Button>
          <Transition
            as={Fragment}
            enter='transition ease-out duration-100'
            enterFrom='transform opacity-0 scale-95'
            enterTo='transform opacity-100 scale-100'
            leave='transition ease-in duration-75'
            leaveFrom='transform opacity-100 scale-100'
            leaveTo='transform opacity-0 scale-95'
          >
            <Menu.Items className='absolute right-0 z-10 mt-1 rounded-md overflow-hidden border bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none' style={{
              borderColor: 'var(--bg-color)',
            }}>
              <div>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className='text-black block p-1 text-sm w-44'
                      onClick={() => fetchLevels({
                        ...query,
                        difficultyFilter: '',
                        page: '1',
                      })}
                      role='menuitem'
                      style= {{
                        backgroundColor: active ? 'rgb(200, 200, 200)' : '',
                      }}
                    >
                      All Difficulties
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className='text-black block p-1 text-sm w-44 flex items-center gap-1 justify-center'
                      onClick={() => fetchLevels({
                        ...query,
                        difficultyFilter: 'Pending',
                        page: '1',
                      })}
                      role='menuitem'
                      style= {{
                        backgroundColor: active ? 'rgb(200, 200, 200)' : '',
                      }}
                    >
                      <span>⏳</span>
                      <span>Pending</span>
                    </button>
                  )}
                </Menu.Item>
                {difficultyList.filter(difficulty => difficulty.name !== 'Pending').map((difficulty) => (
                  <Menu.Item key={`difficulty-item-${difficulty.value}`}>
                    {({ active }) => (
                      <button
                        className='text-black block p-1 text-sm w-44 flex items-center gap-1 justify-center'
                        onClick={() => fetchLevels({
                          ...query,
                          difficultyFilter: difficulty.name,
                          page: '1',
                        })}
                        role='menuitem'
                        style= {{
                          backgroundColor: getDifficultyColor(difficulty.value * 1.5 + 30, active ? 50 : 70)
                        }}
                      >
                        <span>{difficulty.emoji}</span>
                        <span>{difficulty.name}</span>
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
        <TimeRangeMenu onTimeRangeClick={onTimeRangeClick} timeRange={query.timeRange} />
      </div>
      <div className='flex items-center justify-center py-0.5'>
        <label htmlFor='min-step' className='text-xs font-medium pr-1'>Min steps</label>
        <input
          className='form-range pl-2 w-16 h32 bg-gray-200 font-medium rounded-lg appearance-none cursor-pointer dark:bg-gray-700 focus:outline-none focus:ring-0 focus:shadow-none text-gray-900 text-sm dark:text-white mr-2'
          id='min-step'
          max='2500'
          min='1'
          onChange={(e: React.FormEvent<HTMLInputElement>) => {
            queryDebounceHelper({
              minSteps: (e.target as HTMLInputElement).value,
              page: '1',
            });
          }}
          step='1'
          type='number'
          value={query.minSteps}
        />
        <label htmlFor='max-step' className='text-xs font-medium pr-1'>Max steps</label>
        <input
          className='form-range pl-2 w-16 h32 bg-gray-200 font-medium rounded-lg appearance-none cursor-pointer dark:bg-gray-700 focus:outline-none focus:ring-0 focus:shadow-none text-gray-900 text-sm dark:text-white'
          id='max-step'
          max='2500'
          min='1'
          onChange={(e: React.FormEvent<HTMLInputElement>) => {
            queryDebounceHelper({
              maxSteps: (e.target as HTMLInputElement).value,
              page: '1',
            });
          }}
          step='1'
          type='number'
          value={query.maxSteps}
        />
      </div>
      <div className='flex justify-center items-center gap-2'>
        <Link href='/settings/proaccount' passHref>
          <Image alt='pro' src='/pro.svg' width='20' height='20' />
        </Link>
        <div className='flex flex-col items-center justify-center w-fit border p-2 rounded-md gap-2 border-cyan-200'>
          <div className='flex items-center justify-center'>
            <span className='text-xs font-medium pr-1'>Min dimensions:</span>
            <input
              className='form-range pl-2 w-12 h32 bg-gray-200 font-medium rounded-lg appearance-none cursor-pointer dark:bg-gray-700 focus:outline-none focus:ring-0 focus:shadow-none text-gray-900 text-sm dark:text-white'
              disabled={!isPro(reqUser)}
              max='40'
              min='1'
              onChange={(e: React.FormEvent<HTMLInputElement>) => {
                queryDebounceHelper({
                  minDimension1: (e.target as HTMLInputElement).value,
                  page: '1',
                });
              }}
              step='1'
              type='number'
              value={query.minDimension1}
            />
            <span className='text-xs font-medium px-1'>x</span>
            <input
              className='form-range pl-2 w-12 h32 bg-gray-200 font-medium rounded-lg appearance-none cursor-pointer dark:bg-gray-700 focus:outline-none focus:ring-0 focus:shadow-none text-gray-900 text-sm dark:text-white'
              disabled={!isPro(reqUser)}
              max='40'
              min='1'
              onChange={(e: React.FormEvent<HTMLInputElement>) => {
                queryDebounceHelper({
                  minDimension2: (e.target as HTMLInputElement).value,
                  page: '1',
                });
              }}
              step='1'
              type='number'
              value={query.minDimension2}
            />
          </div>
          <div className='flex items-center justify-center'>
            <span className='text-xs font-medium pr-1'>Max dimensions:</span>
            <input
              className='form-range pl-2 w-12 h32 bg-gray-200 font-medium rounded-lg appearance-none cursor-pointer dark:bg-gray-700 focus:outline-none focus:ring-0 focus:shadow-none text-gray-900 text-sm dark:text-white'
              disabled={!isPro(reqUser)}
              max='40'
              min='1'
              onChange={(e: React.FormEvent<HTMLInputElement>) => {
                queryDebounceHelper({
                  maxDimension1: (e.target as HTMLInputElement).value,
                  page: '1',
                });
              }}
              step='1'
              type='number'
              value={query.maxDimension1}
            />
            <span className='text-xs font-medium px-1'>x</span>
            <input
              className='form-range pl-2 w-12 h32 bg-gray-200 font-medium rounded-lg appearance-none cursor-pointer dark:bg-gray-700 focus:outline-none focus:ring-0 focus:shadow-none text-gray-900 text-sm dark:text-white'
              disabled={!isPro(reqUser)}
              max='40'
              min='1'
              onChange={(e: React.FormEvent<HTMLInputElement>) => {
                queryDebounceHelper({
                  maxDimension2: (e.target as HTMLInputElement).value,
                  page: '1',
                });
              }}
              step='1'
              type='number'
              value={query.maxDimension2}
            />
          </div>
          <div className='flex items-center justify-center' role='group'>
            <FilterButton
              element={
                <span style={{
                  backgroundColor: 'var(--level-block)',
                  borderColor: 'var(--level-block-border)',
                  borderWidth: 5,
                  boxShadow: '0 0 0 1px var(--bg-color)',
                  display: 'block',
                  height: 24,
                  width: 24,
                }} />
              }
              first={true}
              onClick={onBlockFilterClick}
              proRequired={true}
              selected={(Number(query.blockFilter) & BlockFilterMask.BLOCK) !== BlockFilterMask.NONE}
              transparent={true}
              value={BlockFilterMask.BLOCK.toString()}
            />
            <FilterButton
              element={
                <span style={{
                  backgroundColor: 'var(--level-block)',
                  borderColor: 'var(--level-block-border)',
                  borderWidth: '5px 0',
                  boxShadow: '0 0 0 1px var(--bg-color)',
                  display: 'block',
                  height: 24,
                  width: 24,
                }} />
              }
              onClick={onBlockFilterClick}
              proRequired={true}
              selected={(Number(query.blockFilter) & BlockFilterMask.RESTRICTED) !== BlockFilterMask.NONE}
              transparent={true}
              value={BlockFilterMask.RESTRICTED.toString()}
            />
            <FilterButton
              element={
                <span style={{
                  backgroundColor: 'var(--level-hole)',
                  borderColor: 'var(--level-hole-border)',
                  borderWidth: 5,
                  boxShadow: '0 0 0 1px var(--bg-color)',
                  display: 'block',
                  height: 24,
                  width: 24,
                }} />
              }
              last={true}
              onClick={onBlockFilterClick}
              proRequired={true}
              selected={(Number(query.blockFilter) & BlockFilterMask.HOLE) !== BlockFilterMask.NONE}
              transparent={true}
              value={BlockFilterMask.HOLE.toString()}
            />
          </div>
        </div>
        <span className='w-5' />
      </div>
      <div className='flex justify-center'>
        <button
          className='italic underline text-sm'
          onClick={() => {
            setQuery({ ...DefaultQuery });
            fetchLevels({ ...DefaultQuery });
          }}
        >
          Reset search filters
        </button>
      </div>
    </div>
  );

  return (<>
    <NextSeo
      title={'Search - Pathology'}
      canonical={'https://pathology.gg/search'}
      openGraph={{
        title: 'Search - Pathology',
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
                  Try <button className='underline' onClick={() => {onTimeRangeClick(TimeRange[TimeRange.All]);}}>expanding</button> the time range.
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
      </>
    </Page>
  </>);
}
