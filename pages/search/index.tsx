import { Menu, Transition } from '@headlessui/react';
import classNames from 'classnames';
import { debounce } from 'debounce';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { ParsedUrlQuery, ParsedUrlQueryInput } from 'querystring';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import DataTable, { Alignment, TableColumn } from 'react-data-table-component';
import { getDifficultyColor, getDifficultyList, getFormattedDifficulty } from '../../components/difficultyDisplay';
import EnrichedLevelLink from '../../components/enrichedLevelLink';
import FilterButton from '../../components/filterButton';
import MultiSelectUser from '../../components/multiSelectUser';
import Page from '../../components/page';
import TimeRange from '../../constants/timeRange';
import { DATA_TABLE_CUSTOM_STYLES } from '../../helpers/dataTableCustomStyles';
import { FilterSelectOption } from '../../helpers/filterSelectOptions';
import getFormattedDate from '../../helpers/getFormattedDate';
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
  block_filter?: string;
  difficulty_filter?: string;
  disable_count?: string;
  max_steps?: string;
  min_steps?: string;
  num_results?: string;
  page?: string;
  min_rating?: string;
  max_rating?: string;
  search?: string;
  searchAuthor?: string;
  searchAuthorId?: string;
  show_filter?: FilterSelectOption;
  sort_by: string;
  sort_dir?: string;
  time_range: string;

}

const DefaultQuery = {
  block_filter: String(BlockFilterMask.NONE),
  difficulty_filter: '',
  max_steps: '2500',
  min_steps: '0',
  page: '1',
  search: '',
  searchAuthor: '',
  searchAuthorId: '',
  show_filter: FilterSelectOption.All,
  sort_by: 'reviews_score',
  sort_dir: 'desc',
  time_range: TimeRange[TimeRange.Week],
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

  const query = await doQuery(searchQuery, reqUser?._id);

  if (!query) {
    throw new Error('Error querying Levels');
  }

  return {
    props: {
      enrichedLevels: JSON.parse(JSON.stringify(query.levels)),
      reqUser: JSON.parse(JSON.stringify(reqUser)),
      searchQuery: searchQuery,
      totalRows: query.totalRows,
    } as SearchProps,
  };
}

interface SearchProps {
  enrichedLevels: EnrichedLevel[];
  reqUser: User;
  searchQuery: SearchQuery;
  totalRows: number;
}

/* istanbul ignore next */
export default function Search({ enrichedLevels, reqUser, searchQuery, totalRows }: SearchProps) {
  const [data, setData] = useState<EnrichedLevel[]>();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(searchQuery);
  const router = useRouter();

  useEffect(() => {
    setData(enrichedLevels);
    setLoading(false);
  }, [enrichedLevels, setLoading]);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  const fetchLevels = useCallback((query: SearchQuery) => {
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
  }, [router, setLoading]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queryDebounce = useCallback(
    debounce((q: SearchQuery) => {
      fetchLevels(q);
    }, 500),
    []
  );

  const setQueryHelper = useCallback((update: Partial<SearchQuery>) => {
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
      minWidth: '150px',
      selector: (row: EnrichedLevel) => <div className='flex flex-row space-x-5'>
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
        <Link href={getProfileSlug(row.userId)} className='font-bold underline'>
          {row.userId.name}
        </Link>
      </div>,
      sortable: true,
    },
    {
      id: 'name',
      name: 'Name',
      grow: 2,
      selector: (row: EnrichedLevel) => <EnrichedLevelLink level={row} />,
      ignoreRowClick: true,
      sortable: true,
    },
    {
      id: 'calc_difficulty_estimate',
      name: 'Difficulty',
      selector: (row: EnrichedLevel) => getFormattedDifficulty(row.calc_difficulty_estimate, row.calc_playattempts_unique_users_count),
      ignoreRowClick: true,
      sortable: true,
      allowOverflow: true,
      width: '150px',
    },
    {
      id: 'ts',
      name: 'Created',
      selector: (row: EnrichedLevel) => row.ts,
      format: (row: EnrichedLevel) => getFormattedDate(row.ts),
      sortable: true,
    },
    {
      grow: 0.45,
      id: 'least_moves',
      name: 'Steps',
      selector: (row: EnrichedLevel) => `${row.userMoves !== undefined && row.userMoves !== row.leastMoves ? `${row.userMoves}/` : ''}${row.leastMoves}`,
      sortable: true,
    },
    {
      id: 'players_beaten',
      name: 'Users Won',
      selector: (row: EnrichedLevel) => row.calc_stats_players_beaten || 0,
      sortable: true,
    },
    {
      id: 'reviews_score',
      name: 'Review Score',
      selector: (row: EnrichedLevel) => {return row.calc_reviews_count === 0 ? '-' : row.calc_reviews_score_laplace?.toFixed(2);},
      sortField: 'reviews_score',
      sortable: true,
    },
  ] as TableColumn<EnrichedLevel>[];

  const onTimeRangeClick = useCallback((timeRangeKey: string) => {
    fetchLevels({
      ...query,
      page: '1',
      time_range: query.time_range === timeRangeKey ? TimeRange[TimeRange.All] : timeRangeKey,
    });
  }, [fetchLevels, query]);

  const timeRangeButtons = [];

  for (const timeRangeKey in TimeRange) {
    if (isNaN(Number(timeRangeKey))) {
      timeRangeButtons.push(
        <button
          className={classNames(
            'px-3 py-2.5 text-white font-medium text-xs leading-tight hover:bg-blue-700 active:bg-blue-800 transition duration-150 ease-in-out',
            query.time_range === timeRangeKey ? 'bg-blue-800' : 'bg-blue-600',
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
      block_filter: String(Number(query.block_filter) ^ Number(e.currentTarget.value)),
    });
  };

  const onPersonalFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as FilterSelectOption;

    fetchLevels({
      ...query,
      page: '1',
      show_filter: query.show_filter === value ? FilterSelectOption.All : value,
    });
  };

  const subHeaderComponent = (
    <div className='flex flex-col' id='level_search_box'>
      <div className='flex flex-row flex-wrap items-center justify-center z-10 gap-1 pb-1'>
        <div>
          <input
            className='form-control relative min-w-0 block w-52 px-3 py-1.5 h-10 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded-md transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none'
            id='default-search'
            key='search-level-input'
            onChange={e => {
              setQueryHelper({
                search: e.target.value,
              });
            } }
            placeholder='Search level name...'
            type='search'
            value={query.search}
          />
        </div>
        <div>
          <MultiSelectUser key='search-author-input' defaultValue={query.searchAuthor} onSelect={(user) => {
            setQueryHelper({
              searchAuthor: user?.name || '',
            });
          }} />
        </div>
      </div>
      <div className='flex items-center justify-center mb-1' role='group'>
        {timeRangeButtons}
      </div>
      {reqUser && (
        <div className='flex items-center justify-center mb-1' role='group'>
          <FilterButton element={<>{'Hide Won'}</>} first={true} onClick={onPersonalFilterClick} selected={query.show_filter === FilterSelectOption.HideWon} value={FilterSelectOption.HideWon} />
          <FilterButton element={<>{'Show Won'}</>} onClick={onPersonalFilterClick} selected={query.show_filter === FilterSelectOption.ShowWon} value={FilterSelectOption.ShowWon} />
          <FilterButton element={<>{'Show In Progress'}</>} onClick={onPersonalFilterClick} selected={query.show_filter === FilterSelectOption.ShowInProgress} value={FilterSelectOption.ShowInProgress} />
          <FilterButton element={<>{'Show Unattempted'}</>} last={true} onClick={onPersonalFilterClick} selected={query.show_filter === FilterSelectOption.ShowUnattempted} value={FilterSelectOption.ShowUnattempted} />
        </div>
      )}
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
          selected={(Number(query.block_filter) & BlockFilterMask.BLOCK) !== BlockFilterMask.NONE}
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
          selected={(Number(query.block_filter) & BlockFilterMask.RESTRICTED) !== BlockFilterMask.NONE}
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
          selected={(Number(query.block_filter) & BlockFilterMask.HOLE) !== BlockFilterMask.NONE}
          transparent={true}
          value={BlockFilterMask.HOLE.toString()}
        />
      </div>
      <div className='flex p-2 items-center justify-center'>
        <div className='relative inline-block text-left mr-2'>
          <Menu as='div' className='relative inline-block text-left'>
            <Menu.Button className='inline-flex w-full justify-center rounded-md border border-gray-300 bg-white p-1 text-sm font-medium text-black shadow-sm' id='menu-button' aria-expanded='true' aria-haspopup='true'>
              {query.difficulty_filter !== '' ? query.difficulty_filter : 'Filter Difficulty' }
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
                          difficulty_filter: '',
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
                          difficulty_filter: 'Pending',
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
                            difficulty_filter: difficulty.name,
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
        <label htmlFor='step-max' className=' text-xs font-medium pr-1' style={{ color: 'var(--color)' }}>Max steps</label>
        <input
          className='form-range pl-2 w-16 h32 bg-gray-200 font-medium rounded-lg appearance-none cursor-pointer dark:bg-gray-700 focus:outline-none focus:ring-0 focus:shadow-none text-gray-900 text-sm dark:text-white'
          id='step-max'
          max='2500'
          min='1'
          onChange={(e: React.FormEvent<HTMLInputElement>) => {
            setQueryHelper({
              max_steps: (e.target as HTMLInputElement).value,
              page: '1',
            });
          }}
          step='1'
          type='number'
          value={query.max_steps}
        />
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
      <DataTable
        columns={columns}
        customStyles={DATA_TABLE_CUSTOM_STYLES}
        data={data as EnrichedLevel[]}
        defaultSortAsc={query.sort_dir === 'asc'}
        defaultSortFieldId={query.sort_by}
        dense
        noDataComponent={
          <div className='flex flex-col items-center p-3 gap-3'>
            <span>No records to display...</span>
            {query.time_range !== TimeRange[TimeRange.All] &&
              <span>
                Try <button className='underline' onClick={() => {onTimeRangeClick(TimeRange[TimeRange.All]);}}>expanding</button> time range
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
        onSort={async (column: TableColumn<EnrichedLevel>, sortDirection: string) => {
          const update = {
            sort_dir: sortDirection,
          } as Partial<SearchQuery>;

          if (typeof column.id === 'string') {
            update.sort_by = column.id;
          }

          fetchLevels({
            ...query,
            ...update,
          });
        }}
        pagination={true}
        paginationComponentOptions={{ noRowsPerPage: true }}
        paginationDefaultPage={Number(query.page)}
        paginationPerPage={20}
        paginationServer
        paginationTotalRows={totalRows}
        persistTableHead
        progressPending={loading}
        responsive
        sortServer={true}
        striped
        subHeader
        subHeaderAlign={Alignment.CENTER}
        subHeaderComponent={subHeaderComponent}
      />
    </Page>
  </>);
}
