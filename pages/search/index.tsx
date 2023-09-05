import { Menu, Transition } from '@headlessui/react';
import FormattedDate from '@root/components/formatted/formattedDate';
import DataTable, { TableColumn } from '@root/components/tables/dataTable';
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
import FormattedDifficulty, { getDifficultyColor, getDifficultyList } from '../../components/formatted/formattedDifficulty';
import FormattedLevelLink from '../../components/formatted/formattedLevelLink';
import MultiSelectUser from '../../components/page/multiSelectUser';
import Page from '../../components/page/page';
import TimeRange from '../../constants/timeRange';
import { FilterSelectOption } from '../../helpers/filterSelectOptions';
import getProfileSlug from '../../helpers/getProfileSlug';
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
  showFilter?: FilterSelectOption;
  sortBy: string;
  sortDir: 'desc' | 'asc';
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
  showFilter: FilterSelectOption.All,
  sortBy: 'reviewScore',
  sortDir: 'desc',
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

interface SearchProps {
  enrichedLevels: EnrichedLevel[];
  reqUser: User;
  searchAuthor: User | null;
  searchQuery: SearchQuery;
  totalRows: number;
}

/* istanbul ignore next */
export default function Search({ enrichedLevels, reqUser, searchAuthor, searchQuery, totalRows }: SearchProps) {
  const [data, setData] = useState<EnrichedLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [paginationTotalRows, setPaginationTotalRows] = useState(totalRows);
  const [query, setQuery] = useState(searchQuery);
  const router = useRouter();
  const [searchAuthorUser, setSearchAuthorUser] = useState(searchAuthor);

  useEffect(() => {
    setData(enrichedLevels);
    setLoading(false);
  }, [enrichedLevels, setLoading]);

  // useEffect(() => {
  //   setQuery(searchQuery);
  // }, [searchQuery]);

  const fetchLevels = useCallback((query: SearchQuery) => {
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

    console.log(q);

    const queryParams = new URLSearchParams(query as Record<string, string>);

    fetch(`/api/search?${queryParams}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async res => {
      if (res.status !== 200) {
        throw res.text();
      }

      const response = await res.json();

      setData(response.levels);
      setSearchAuthorUser(response.serachAuthor);
      setPaginationTotalRows(response.totalRows);
    }).catch(async err => {
      const error = JSON.parse(await err)?.error;

      console.error(`Error updating stats: ${error}`);
      // TODO: set something here
    }).finally(() => {
      // NProgress.done();
      router.push({ query: q }, undefined, { shallow: true });
      setLoading(false);
    });

    // router.push({ query: q });
  }, [setLoading]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queryDebounce = useCallback(
    debounce((q: SearchQuery) => {
      console.log('debounce fetch');
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
        // setting page here causes immediate page query
        // page: '1',
      } as SearchQuery;

      queryDebounce(newQ);

      return newQ;
    });
  }, [loading, queryDebounce]);

  const columns2 = [
    {
      id: 'userId',
      name: 'Author',
      selector: (row: EnrichedLevel) => (
        <div className='flex gap-3'>
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
          <Link href={getProfileSlug(row.userId)} className='font-bold underline truncate'>
            {row.userId.name}
          </Link>
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
      selector: (row: EnrichedLevel) => <FormattedLevelLink level={row} />,
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
      selector: (row: EnrichedLevel) => {return row.calc_reviews_count === 0 ? '-' : row.calc_reviews_score_laplace?.toFixed(2);},
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

  const onPersonalFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as FilterSelectOption;

    fetchLevels({
      ...query,
      page: '1',
      showFilter: query.showFilter === value ? FilterSelectOption.All : value,
    });
  };

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
          <MultiSelectUser key='search-author-input' defaultValue={searchAuthorUser} onSelect={(user) => {
            queryDebounceHelper({
              searchAuthor: user?.name || '',
            });
          }} />
        </div>
      </div>
      <div className='flex items-center justify-center' role='group'>
        {timeRangeButtons}
      </div>
      {reqUser && (
        <div className='flex items-center justify-center' role='group'>
          <FilterButton
            element={<>{'Hide Won'}</>}
            first={true}
            onClick={onPersonalFilterClick}
            selected={query.showFilter === FilterSelectOption.HideWon}
            value={FilterSelectOption.HideWon}
          />
          <FilterButton
            element={<>{'Show Won'}</>}
            onClick={onPersonalFilterClick}
            selected={query.showFilter === FilterSelectOption.ShowWon}
            value={FilterSelectOption.ShowWon}
          />
          <FilterButton
            element={<>{'Show In Progress'}</>}
            onClick={onPersonalFilterClick}
            selected={query.showFilter === FilterSelectOption.ShowInProgress}
            value={FilterSelectOption.ShowInProgress}
          />
          <FilterButton
            element={<>{'Show Unattempted'}</>}
            last={true}
            onClick={onPersonalFilterClick}
            selected={query.showFilter === FilterSelectOption.ShowUnattempted}
            value={FilterSelectOption.ShowUnattempted}
          />
        </div>
      )}
      <div className='flex items-center justify-center py-0.5'>
        <div className='relative inline-block text-left mr-2'>
          <Menu as='div' className='relative inline-block text-left'>
            <Menu.Button className='inline-flex w-full justify-center rounded-md border border-gray-300 bg-white p-1 text-sm font-medium text-black shadow-sm' id='menu-button' aria-expanded='true' aria-haspopup='true'>
              {query.difficultyFilter !== '' ? query.difficultyFilter : 'Filter Difficulty' }
              <svg className='-mr-1 ml-2 h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
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
              <Menu.Items className='absolute right-0 z-10 mt-2 rounded-md overflow-hidden border bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none' style={{
                borderColor: 'var(--bg-color)',
              }}>
                <div>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className='text-black block p-1 text-sm w-40'
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
                        All
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className='text-black block p-1 text-sm w-40'
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
                        <span className='pr-1'>
                          ⏳
                        </span>
                        Pending
                      </button>
                    )}
                  </Menu.Item>
                  {getDifficultyList().filter(difficulty => difficulty.name !== 'Pending').map((difficulty) => (
                    <Menu.Item key={`difficulty-item-${difficulty.value}`}>
                      {({ active }) => (
                        <button
                          className='text-black block p-1 text-sm w-40'
                          onClick={() => fetchLevels({
                            ...query,
                            difficultyFilter: difficulty.name,
                            page: '1',
                          })}
                          role='menuitem'
                          style= {{
                            backgroundColor: getDifficultyColor(difficulty.value + 30, active ? 50 : 70)
                          }}
                        >
                          <span className='pr-1'>
                            {difficulty.emoji}
                          </span>
                          {difficulty.name}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
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
          columns={columns2}
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
            console.log('change page fetch 2', pg);
            fetchLevels({
              ...query,
              page: String(pg),
            });
          }}
          onSort={(columnId: string) => {
            const update = {
              sortBy: columnId,
              // default to most useful sort direction
              sortDir: columnId === 'playersBeaten' || columnId === 'reviewScore' ? 'desc' : 'asc',
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
          totalItems={paginationTotalRows}
        />
      </>
    </Page>
  </>);
}
