import DataTable, { Alignment, TableColumn } from 'react-data-table-component';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import Link from 'next/link';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import SelectOptionStats from '../../models/selectOptionStats';
import SkeletonPage from '../../components/skeletonPage';
import StatsHelper from '../../helpers/statsHelper';
import TimeRange from '../../constants/timeRange';
import classNames from 'classnames';
import dbConnect from '../../lib/dbConnect';
import { debounce } from 'debounce';
import { doQuery } from '../api/search';
import { getUserFromToken } from '../../lib/withAuth';
import moment from 'moment';
import usePush from '../../hooks/usePush';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';

export interface SearchQuery extends ParsedUrlQuery {
  block_filter?: string;
  max_steps?: string;
  min_steps?: string;
  page?: string;
  search?: string;
  searchAuthor?: string;
  show_filter?: string;
  sort_by: string;
  sort_dir?: string;
  time_range: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  // must be authenticated
  const user = await getUserFromToken(context.req?.cookies?.token);

  if (!user) {
    throw new Error('Not authenticated');
  }

  let searchQuery: SearchQuery = {
    sort_by: 'reviews_score',
    time_range: TimeRange[TimeRange.Week]
  };

  // check if context.query is empty
  if (context.query && (Object.keys(context.query).length > 0)) {
    searchQuery = context.query as SearchQuery;
  }

  const query = await doQuery(searchQuery, user._id.toString());

  if (!query) {
    throw new Error('Error finding Levels');
  }

  return {
    props: {
      levels: JSON.parse(JSON.stringify(query.data)),
      searchQuery: searchQuery,
      total: query.total,
    } as SearchProps,
  };
}

type EnrichedLevel = Level & { stats?: SelectOptionStats };

interface FilterButtonProps {
  first?: boolean;
  last?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  selected: boolean;
  text: string;
  value: string;
}

export function FilterButton({ first, last, onClick, selected, text, value }: FilterButtonProps) {
  return (
    <button
      className={classNames(
        'px-3 py-2.5 text-white font-medium text-xs leading-tight hover:bg-yellow-700 active:bg-yellow-800 transition duration-150 ease-in-out',
        first ? 'rounded-tl-lg rounded-bl-lg' : undefined,
        last ? 'rounded-tr-lg rounded-br-lg' : undefined,
        selected ? 'bg-yellow-800' : 'bg-gray-600',
      )}
      onClick={onClick}
      value={value}
    >
      {text}
    </button>
  );
}

interface SearchProps {
  levels: Level[];
  searchQuery: SearchQuery;
  total: number;
}

// https://github.com/jbetancur/react-data-table-component/blob/master/src/DataTable/styles.ts
export const dataTableStyle = {
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
};

export default function Search({ levels, searchQuery, total }: SearchProps) {
  const { stats } = useStats();
  const router = useRouter();
  const routerPush = usePush();
  const enrichWithStats = useCallback((levels: EnrichedLevel[]) => {
    const levelStats = StatsHelper.levelStats(levels, stats);

    for (let i = 0; i < levels.length; i++) {
      levels[i].stats = levelStats[i];
    }

    return levels;
  }, [stats]);

  const [data, setData] = useState(enrichWithStats(levels));
  const [headerMsg, setHeaderMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(total);

  const [blockFilter, setBlockFilter] = useState('');
  const [maxSteps, setMaxSteps] = useState('2500');
  const [page, setPage] = useState(1);
  const [searchLevel, setSearchLevel] = useState('');
  const [searchLevelText, setSearchLevelText] = useState('');
  const [searchAuthor, setSearchAuthor] = useState('');
  const [searchAuthorText, setSearchAuthorText] = useState('');
  const [showFilter, setShowFilter] = useState('');
  const [sortBy, setSortBy] = useState('reviews_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [timeRange, setTimeRange] = useState(TimeRange[TimeRange.Week]);
  const [url, setUrl] = useState(router.asPath.substring(1, router.asPath.length));
  const firstLoad = useRef(true);

  useEffect(() => {
    setBlockFilter(searchQuery.block_filter || '');
    setMaxSteps(searchQuery.max_steps || '2500');
    setPage(searchQuery.page ? parseInt(router.query.page as string) : 1);
    setSearchLevel(searchQuery.search || '');
    setSearchLevelText(searchQuery.search || '');
    setSearchAuthor(searchQuery.searchAuthor || '');
    setSearchAuthorText(searchQuery.searchAuthor || '');
    setShowFilter(searchQuery.show_filter || '');

    setSortBy(searchQuery.sort_by || 'reviews_score');
    setSortOrder(searchQuery.sort_dir || 'desc');
    setTimeRange(searchQuery.time_range || TimeRange[TimeRange.Week]);
  }, [router, searchQuery]);

  // enrich the data that comes with the page
  useEffect(() => {
    setData(enrichWithStats(levels));
    setTotalRows(total);
    setLoading(false);
  }, [levels, total, enrichWithStats]);

  // @TODO: enrich the data in getStaticProps.
  useEffect(() => {
    setLoading(true);
    routerPush('/' + url);
  }, [url, routerPush]);

  const fetchLevels = useCallback(async () => {
    if (firstLoad.current) {
      firstLoad.current = false;

      return;
    }

    const routerUrl = 'search?page=' + (page) + '&time_range=' + timeRange + '&show_filter=' + showFilter + '&sort_by=' + sortBy + '&sort_dir=' + sortOrder + '&min_steps=0&max_steps=' + maxSteps + '&block_filter=' + blockFilter + '&searchAuthor=' + searchAuthor + '&search=' + searchLevel;

    setUrl(routerUrl);
  }, [blockFilter, maxSteps, page, searchLevel, searchAuthor, showFilter, sortBy, sortOrder, timeRange]);

  const handleSort = async (column: TableColumn<EnrichedLevel>, sortDirection: string) => {
    if (typeof column.id === 'string') {
      setSortBy(column.id);
    }

    setSortOrder(sortDirection);
    setHeaderMsg('');
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
      selector: (row: EnrichedLevel) => row.userId.name,
      cell: (row: EnrichedLevel) => <div className='flex flex-row space-x-5'>
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
            <path d='M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z'/>
          </svg></button>
        <Link href={'profile/' + row.userId._id}>
          <a className='font-bold underline'>{row.userId.name}</a>
        </Link>
      </div>,
    },
    {
      id: 'name',
      name: 'Name',
      grow: 2,
      selector: (row: EnrichedLevel) => row.name,
      ignoreRowClick: true,
      cell: (row: EnrichedLevel) => <Link href={'level/' + row.slug}><a className='font-bold underline'>{row.name}</a></Link>,
      conditionalCellStyles: [
        {
          when: (row: EnrichedLevel) => row.stats?.userTotal ? row.stats.userTotal > 0 : false,
          style: (row: EnrichedLevel) => ({
            color: row.stats ? row.stats.userTotal === row.stats.total ? 'var(--color-complete)' : 'var(--color-incomplete)' : undefined,
          }),
        },
      ]
    },
    {
      id: 'ts',
      name: 'Created',
      selector: (row: EnrichedLevel) => row.ts,
      format: (row: EnrichedLevel) => moment.unix(row.ts).fromNow(),
      sortable: true
    },
    {
      grow: 0.45,
      id: 'least_moves',
      name: 'Steps',
      selector: (row: EnrichedLevel) => row.leastMoves,
      sortable: true
    },
    {
      id: 'players_beaten',
      name: 'Users Won',
      selector: (row: EnrichedLevel) => row.calc_stats_players_beaten || 0,
      sortable: true
    },
    {
      id: 'reviews_score',
      name: 'Review Score',
      selector: (row: EnrichedLevel) => row.calc_reviews_score_laplace?.toFixed(2),
      sortField: 'reviews_score',
      sortable: true
    },
  ];

  const onTimeRangeClick = (timeRangeKey: string) => {
    if (timeRange === timeRangeKey) {
      setTimeRange(TimeRange[TimeRange.All]);
    } else {
      setTimeRange(timeRangeKey);
    }
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
    setBlockFilter(blockFilter === e.currentTarget.value ? 'all' : e.currentTarget.value);
  };

  const onPersonalFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setShowFilter(showFilter === e.currentTarget.value ? 'all' : e.currentTarget.value);
  };

  const onStepSliderChange = (e: React.FormEvent<HTMLInputElement>) => {
    setMaxSteps(e.currentTarget.value);
  };

  const subHeaderComponent = (
    <>
      {!headerMsg ? null : <div>{headerMsg}</div>}
      <div className='flex flex-col' id='level_search_box'>
        <div className='flex flex-row items-center'>
          <input onChange={e=>setSearchLevelText(e.target.value)} type='search' id='default-search' className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-4 p-2.5 mb-1 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500' placeholder='Search level name...' value={searchLevelText} />
          <input onChange={e=>setSearchAuthorText(e.target.value)} type='search' id='default-search' className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-4 p-2.5 mb-1 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500' placeholder='Search author name...' value={searchAuthorText} />
        </div>
        <div className='flex items-center justify-center mb-1' role='group'>
          {timeRangeButtons}
        </div>
        <div className='flex items-center justify-center mb-1' role='group'>
          <FilterButton first={true} onClick={onPersonalFilterClick} selected={showFilter === 'hide_won'} text='Hide Won' value='hide_won' />
          <FilterButton last={true} onClick={onPersonalFilterClick} selected={showFilter === 'only_attempted'} text='Show In Progress' value='only_attempted' />
        </div>
        <div className='flex items-center justify-center' role='group'>
          <FilterButton first={true} onClick={onBlockFilterClick} selected={blockFilter === 'pp1'} text='PP1' value='pp1' />
          <FilterButton last={true} onClick={onBlockFilterClick} selected={blockFilter === 'pp2'} text='PP2+' value='pp2' />
        </div>
        <div className='flex h-10 w-full items-center justify-center'>
          <label htmlFor='step-max' className='md:w-1/6 block text-xs font-medium pr-1' style={{ color: 'var(--color)' }}>Max steps</label>
          <input id='step-max' onChange={onStepSliderChange} value={maxSteps} step='1' type='number' min='1' max='2500' className='form-range pl-2 w-16 h32 bg-gray-200 font-medium rounded-lg appearance-none cursor-pointer dark:bg-gray-700 focus:outline-none focus:ring-0 focus:shadow-none text-gray-900 text-sm dark:text-white'/>
        </div>
      </div>
    </>
  );

  return (
    <Page title={'Search'}>
      <DataTable
        columns={columns}
        customStyles={dataTableStyle}
        data={data}
        defaultSortAsc={sortOrder === 'asc'}
        defaultSortFieldId={sortBy}
        dense
        fixedHeader
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
    </Page>
  );
}
