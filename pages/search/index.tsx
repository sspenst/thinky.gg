import classNames from 'classnames';
import { debounce } from 'debounce';
import moment from 'moment';
import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import DataTable, { Alignment, TableColumn } from 'react-data-table-component';
import { getDifficultyColor, getDifficultyList, getFormattedDifficulty } from '../../components/difficultyDisplay';
import EnrichedLevelLink from '../../components/enrichedLevelLink';
import FilterButton from '../../components/filterButton';
import MultiSelectUser from '../../components/multiSelectUser';
import Page from '../../components/page';
import SkeletonPage from '../../components/skeletonPage';
import TimeRange from '../../constants/timeRange';
import { AppContext } from '../../contexts/appContext';
import { FilterSelectOption } from '../../helpers/filterSelectOptions';
import getProfileSlug from '../../helpers/getProfileSlug';
import usePush from '../../hooks/usePush';
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
  max_steps?: string;
  min_steps?: string;
  page?: string;
  search?: string;
  searchAuthor?: string;
  searchAuthorId?: string;
  show_filter?: FilterSelectOption;
  sort_by: string;
  sort_dir?: string;
  time_range: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token) : null;
  const searchQuery: SearchQuery = {
    sort_by: 'reviews_score',
    time_range: TimeRange[TimeRange.Week]
  };

  if (context.query && (Object.keys(context.query).length > 0)) {
    for (const q in context.query as SearchQuery) {
      searchQuery[q] = context.query[q];
    }
  }

  const query = await doQuery(searchQuery, reqUser?._id.toString(), '-authorNote -data -height -width');

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
  const [blockFilter, setBlockFilter] = useState(BlockFilterMask.NONE);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [difficultyFilterHover, setDifficultyFilterHover] = useState<string>('');
  const [difficultyFilterOpen, setDifficultyFilterOpen] = useState(false);
  const firstLoad = useRef(true);
  const [loading, setLoading] = useState(false);
  const [maxSteps, setMaxSteps] = useState('2500');
  const [page, setPage] = useState(1);
  const router = useRouter();
  const routerPush = usePush();
  const [searchLevel, setSearchLevel] = useState('');
  const [searchLevelText, setSearchLevelText] = useState('');
  const [searchAuthor, setSearchAuthor] = useState('');
  const [searchAuthorText, setSearchAuthorText] = useState('');
  const { setIsLoading } = useContext(AppContext);
  const [showFilter, setShowFilter] = useState(FilterSelectOption.All);
  const [sortBy, setSortBy] = useState('reviews_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [timeRange, setTimeRange] = useState(TimeRange[TimeRange.Week]);
  const [url, setUrl] = useState(router.asPath.substring(1, router.asPath.length));

  useEffect(() => {
    setBlockFilter(searchQuery.block_filter ? Number(searchQuery.block_filter) : BlockFilterMask.NONE);
    setDifficultyFilter(searchQuery.difficulty_filter || '');
    setMaxSteps(searchQuery.max_steps !== undefined ? searchQuery.max_steps : '2500');
    setPage(searchQuery.page ? parseInt(searchQuery.page as string) : 1);
    setSearchLevel(searchQuery.search || '');
    setSearchLevelText(searchQuery.search || '');
    setSearchAuthor(searchQuery.searchAuthor || '');
    setSearchAuthorText(searchQuery.searchAuthor || '');
    setShowFilter(searchQuery.show_filter || FilterSelectOption.All);
    setSortBy(searchQuery.sort_by || 'reviews_score');
    setSortOrder(searchQuery.sort_dir || 'desc');
    setTimeRange(searchQuery.time_range || TimeRange[TimeRange.Week]);
  }, [searchQuery]);

  useEffect(() => {
    setLoading(false);
  }, [enrichedLevels]);

  useEffect(() => {
    setLoading(true);
    routerPush('/' + url);
  }, [url, routerPush]);

  useEffect(() => {
    setIsLoading(loading);
  }, [loading, setIsLoading]);

  const fetchLevels = useCallback(async () => {
    if (firstLoad.current) {
      firstLoad.current = false;

      return;
    }

    //firstLoad.current = true; // uncommenting this out fixes back button but breaks search
    const routerUrl = 'search?page=' + encodeURIComponent(page) + '&time_range=' + encodeURIComponent(timeRange) + '&difficulty_filter=' + encodeURIComponent(difficultyFilter) + '&show_filter=' + encodeURIComponent(showFilter) + '&sort_by=' + encodeURIComponent(sortBy) + '&sort_dir=' + encodeURIComponent(sortOrder) + '&min_steps=0&max_steps=' + encodeURIComponent(maxSteps) + '&block_filter=' + encodeURIComponent(blockFilter) + '&searchAuthor=' + encodeURIComponent(searchAuthor) + '&search=' + encodeURIComponent(searchLevel);

    setUrl(routerUrl);
  }, [blockFilter, difficultyFilter, maxSteps, page, searchAuthor, searchLevel, showFilter, sortBy, sortOrder, timeRange]);

  const handleSort = async (column: TableColumn<EnrichedLevel>, sortDirection: string) => {
    if (typeof column.id === 'string') {
      setSortBy(column.id);
    }

    setSortOrder(sortDirection);
  };

  const handlePageChange = (pg: number) => {
    setPage(pg);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setSearchLevelQueryVariable = useCallback(
    debounce((name: string) => {
      setSearchLevel(name);
    }, 500),
    []
  );

  useEffect(() => {
    setSearchLevelQueryVariable(searchLevelText);
  }, [setSearchLevelQueryVariable, searchLevelText]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setSearchAuthorQueryVariable = useCallback(
    debounce((name: string) => {
      setSearchAuthor(name);
    }, 500),
    []
  );

  useEffect(() => {
    setSearchAuthorQueryVariable(searchAuthorText);
  }, [setSearchAuthorQueryVariable, searchAuthorText]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  if (router.isFallback) {
    return <SkeletonPage />;
  }

  const columns = [
    {
      id: 'userId',
      name: 'Author',
      minWidth: '150px',
      selector: (row: EnrichedLevel) => <div className='flex flex-row space-x-5'>
        <button style={{
          display: searchAuthor.length > 0 ? 'none' : 'block',
        }} onClick={
          () => {
            if (searchAuthor === row.userId.name) {
              setSearchAuthorText('');
            } else {
              setSearchAuthorText(row.userId.name);
            }
          }
        }><svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-filter' viewBox='0 0 16 16'>
            <path d='M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z' />
          </svg></button>
        <Link href={getProfileSlug(row.userId)}>
          <a className='font-bold underline'>{row.userId.name}</a>
        </Link>
      </div>,
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
      id: 'difficultyEstimate',
      name: 'Difficulty',
      selector: (row: EnrichedLevel) => getFormattedDifficulty(row),
      ignoreRowClick: true,
      sortable: false,
      allowOverflow: true,
      width: '150px',
    },
    {
      id: 'ts',
      name: 'Created',
      selector: (row: EnrichedLevel) => row.ts,
      format: (row: EnrichedLevel) => moment.unix(row.ts).fromNow(),
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

  const onTimeRangeClick = (timeRangeKey: string) => {
    if (timeRange === timeRangeKey) {
      setTimeRange(TimeRange[TimeRange.All]);
    } else {
      setTimeRange(timeRangeKey);
    }

    fetchLevels();
  };

  const timeRangeButtons = [];

  for (const timeRangeKey in TimeRange) {
    if (isNaN(Number(timeRangeKey))) {
      timeRangeButtons.push(
        <button
          className={classNames(
            'px-3 py-2.5 text-white font-medium text-xs leading-tight hover:bg-blue-700 active:bg-blue-800 transition duration-150 ease-in-out',
            timeRange === timeRangeKey ? 'bg-blue-800' : 'bg-blue-600',
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
    setBlockFilter(blockFilter ^ Number(e.currentTarget.value));
  };

  const onPersonalFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as FilterSelectOption;

    setShowFilter(showFilter === value ? FilterSelectOption.All : value);
  };

  const onStepSliderChange = (e: React.FormEvent<HTMLInputElement>) => {
    setMaxSteps(e.currentTarget.value);
  };

  const subHeaderComponent = (
    <div className='flex flex-col' id='level_search_box'>
      <div className='flex flex-row flex-wrap items-center justify-center z-10 gap-1 pb-1'>
        <div className=''>
          <input key='search-level-input' onChange={e => {!loading && setSearchLevelText(e.target.value);}} type='search' id='default-search' className='form-control relative min-w-0 block w-52 px-3 py-1.5 h-10 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded-md transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' placeholder='Search level name...' value={searchLevelText} />
        </div>
        <div className=''>
          <MultiSelectUser key='search-author-input' defaultValue={searchAuthorText} onSelect={(user) => {!loading && setSearchAuthorText(user?.name || '');}} />
        </div>
      </div>
      <div className='flex items-center justify-center mb-1' role='group'>
        {timeRangeButtons}
      </div>
      {reqUser && (
        <div className='flex items-center justify-center mb-1' role='group'>
          <FilterButton element={<>{'Hide Won'}</>} first={true} onClick={onPersonalFilterClick} selected={showFilter === FilterSelectOption.HideWon} value={FilterSelectOption.HideWon} />
          <FilterButton element={<>{'Show In Progress'}</>} last={true} onClick={onPersonalFilterClick} selected={showFilter === FilterSelectOption.ShowInProgress} value={FilterSelectOption.ShowInProgress} />
        </div>
      )}
      <div className='flex items-center justify-center' role='group'>
        <FilterButton
          element={
            <span style={{
              backgroundColor: 'var(--level-block)',
              borderColor: 'var(--level-block-border)',
              borderWidth: 5,
              boxShadow: '0 0 0 1px var(--level-grid-border)',
              display: 'block',
              height: 24,
              width: 24,
            }} />
          }
          first={true}
          onClick={onBlockFilterClick}
          selected={(blockFilter & BlockFilterMask.BLOCK) !== BlockFilterMask.NONE}
          transparent={true}
          value={BlockFilterMask.BLOCK.toString()}
        />
        <FilterButton
          element={
            <span style={{
              backgroundColor: 'var(--level-block)',
              borderColor: 'var(--level-block-border)',
              borderWidth: '5px 0',
              boxShadow: '0 0 0 1px var(--level-grid-border)',
              display: 'block',
              height: 24,
              width: 24,
            }} />
          }
          onClick={onBlockFilterClick}
          selected={(blockFilter & BlockFilterMask.RESTRICTED) !== BlockFilterMask.NONE}
          transparent={true}
          value={BlockFilterMask.RESTRICTED.toString()}
        />
        <FilterButton
          element={
            <span style={{
              backgroundColor: 'var(--level-hole)',
              borderColor: 'var(--level-hole-border)',
              borderWidth: 5,
              boxShadow: '0 0 0 1px var(--level-grid-border)',
              display: 'block',
              height: 24,
              width: 24,
            }} />
          }
          last={true}
          onClick={onBlockFilterClick}
          selected={(blockFilter & BlockFilterMask.HOLE) !== BlockFilterMask.NONE}
          transparent={true}
          value={BlockFilterMask.HOLE.toString()}
        />
      </div>
      <div className='flex p-2 items-center justify-center'>
        <div className='relative inline-block text-left mr-2'>
          <button type='button' onClick={() => {
            setDifficultyFilterOpen(!difficultyFilterOpen);
          }} className='inline-flex w-full justify-center rounded-md border border-gray-300 bg-white p-1 text-sm font-medium text-black shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100' id='menu-button' aria-expanded='true' aria-haspopup='true'>
            {difficultyFilter !== '' ? difficultyFilter : 'Filter Difficulty' }
            <svg className='-mr-1 ml-2 h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
              <path fillRule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clipRule='evenodd' />
            </svg>
          </button>
          {difficultyFilterOpen && (
            <div className='absolute right-0 z-10 mt-2 rounded-md overflow-hidden border bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none' role='menu' aria-orientation='vertical' aria-labelledby='menu-button' style={{
              borderColor: 'var(--bg-color)',
            }}>
              <button className='text-black block p-1 text-sm w-40'
                onClick={() => {
                  setDifficultyFilterOpen(false);
                  setDifficultyFilter('');
                }}
                onMouseEnter={() => setDifficultyFilterHover('')}
                onMouseLeave={() => setDifficultyFilterHover('')}
                role='menuitem'
                style= {{
                  backgroundColor: difficultyFilterHover === '' || difficultyFilter === '' ? 'rgb(200, 200, 200)' : '',
                }}
                key={'difficulty-item-all'}
              >
                All
              </button>
              <button className='text-black block p-1 text-sm w-40'
                onClick={() => {
                  setDifficultyFilterOpen(false);
                  setDifficultyFilter('Pending');
                }}
                onMouseEnter={() => setDifficultyFilterHover('Pending')}
                onMouseLeave={() => setDifficultyFilterHover('')}
                role='menuitem'
                style= {{
                  backgroundColor: difficultyFilterHover === 'Pending' || difficultyFilter === 'Pending' ? 'rgb(200, 200, 200)' : '',
                }}
                key={'difficulty-item-pending'}
              >
                Pending ⏳
              </button>
              {getDifficultyList().map((difficulty) => (
                <button className='text-black block p-1 text-sm w-40'
                  onClick={() => {
                    setDifficultyFilterOpen(false);
                    setDifficultyFilter(difficulty.name);
                  }}
                  onMouseEnter={() => setDifficultyFilterHover(difficulty.name)}
                  onMouseLeave={() => setDifficultyFilterHover('')}
                  style= {{
                    backgroundColor: getDifficultyColor(difficulty.value + 30, difficultyFilterHover === difficulty.name || difficultyFilter === difficulty.name ? 50 : 70)
                  }}
                  role='menuitem'
                  key={`difficulty-item-${difficulty.value}`}
                >
                  {difficulty.name}
                  <span className='pl-1'>
                    {difficulty.emoji}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <label htmlFor='step-max' className=' text-xs font-medium pr-1' style={{ color: 'var(--color)' }}>Max steps</label>
        <input id='step-max' onChange={onStepSliderChange} value={maxSteps} step='1' type='number' min='1' max='2500' className='form-range pl-2 w-16 h32 bg-gray-200 font-medium rounded-lg appearance-none cursor-pointer dark:bg-gray-700 focus:outline-none focus:ring-0 focus:shadow-none text-gray-900 text-sm dark:text-white' />
      </div>
    </div>
  );

  return (
    <Page title={'Search'}>
      <div className='searchTableWrapper'>
        <DataTable
          columns={columns}
          // https://github.com/jbetancur/react-data-table-component/blob/master/src/DataTable/styles.ts
          customStyles={{
            subHeader: {
              style: {
                backgroundColor: 'var(--bg-color)',
                color: 'var(--color)',
              },
            },
            headRow: {
              style: {
                backgroundColor: 'var(--bg-color)',
                color: 'var(--color)',
                borderBottomColor: 'var(--bg-color-4)',
              },
            },
            rows: {
              style: {
                backgroundColor: 'var(--bg-color-2)',
                color: 'var(--color)',
              },
              stripedStyle: {
                backgroundColor: 'var(--bg-color-3)',
                color: 'var(--color)',
              },
            },
            pagination: {
              style: {
                backgroundColor: 'var(--bg-color)',
                color: 'var(--color)',
              },
              pageButtonsStyle: {
                fill: 'var(--color)',
                '&:disabled': {
                  fill: 'var(--bg-color-4)',
                },
                '&:hover:not(:disabled)': {
                  backgroundColor: 'var(--bg-color-3)',
                },
                '&:focus': {
                  backgroundColor: 'var(--bg-color-3)',
                },
              }
            },
            noData: {
              style: {
                backgroundColor: 'var(--bg-color)',
                color: 'var(--color)',
              },
            },
            progress: {
              style: {
                backgroundColor: 'var(--bg-color)',
                color: 'var(--color)',
              },
            },
          }}
          data={enrichedLevels}
          defaultSortAsc={sortOrder === 'asc'}
          defaultSortFieldId={sortBy}
          dense
          fixedHeader
          noDataComponent={
            <div className='p-3'>No records to display...
              {timeRange === TimeRange[TimeRange.All] ? (
                <span>
                </span>) : (
                <span>
                  {' '}Try <button className='underline' onClick={() => {onTimeRangeClick(TimeRange[TimeRange.All]);}}>expanding</button> time range
                </span>
              )}
            </div>
          }
          onChangePage={handlePageChange}
          onSort={handleSort}
          pagination={true}
          paginationComponentOptions={{ noRowsPerPage: true }}
          paginationDefaultPage={page}
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
      </div>
    </Page>
  );
}
