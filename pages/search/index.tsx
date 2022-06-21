/* eslint-disable @typescript-eslint/no-explicit-any */
import DataTable, { Alignment } from 'react-data-table-component';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Level from '../../models/db/level';
import Link from 'next/link';
import Page from '../../components/page';
import SkeletonPage from '../../components/skeletonPage';
import StatsHelper from '../../helpers/statsHelper';
import dbConnect from '../../lib/dbConnect';
import { doQuery } from '../api/search';
import { getUserFromToken } from '../../lib/withAuth';
import moment from 'moment';
import usePush from '../../hooks/usePush';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';

export async function getServerSideProps(context: any) {
  await dbConnect();

  // must be authenticated
  const user = await getUserFromToken(context.req?.cookies?.token);

  if (!user) {
    throw new Error('Not authenticated');
  }

  let q = { sort_by: 'reviews_score', time_range: '24h' };
  // check if context.query is empty

  if (context.query && (Object.keys(context.query).length > 0)) {
    q = context.query;
  }

  const query = await doQuery(q, user._id.toString());

  if (!query) {
    throw new Error('Error finding Levels');
  }

  return {
    props: {
      total: query?.total,
      levels: JSON.parse(JSON.stringify(query.data)),
      queryParams: context.query
    } as CatalogProps,
  };
}

interface CatalogProps {
  total: number,
  levels: Level[];
  queryParams: any;
}

export default function Catalog({ total, levels, queryParams }: CatalogProps) {
  const { stats } = useStats();
  const router = useRouter();
  const routerPush = usePush();
  const enrichWithStats = useCallback((levels: any) => {
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

  const [search, setSearch] = useState(queryParams?.search || '');
  const [sort_by, setSort_by] = useState(queryParams?.sort_by || 'reviews_score');
  const [sort_order, setSort_order] = useState(queryParams?.sort_dir || 'desc');
  const [page, setPage] = useState(queryParams.page ? parseInt(router.query.page as string) : 1);
  const [url, setUrl] = useState(router.asPath.substring(1, router.asPath.length));
  const [time_range, setTime_range] = useState(queryParams?.time_range || '24h');
  const [show_filter, setShow_filter] = useState(queryParams?.show_filter || '24h');
  const [max_steps, setMax_steps] = useState(queryParams?.max_steps || '1000');
  const firstLoad = useRef(true);

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

    const routerUrl = 'search?page=' + (page) + '&time_range=' + time_range + '&show_filter=' + show_filter + '&sort_by=' + sort_by + '&sort_dir=' + sort_order + '&min_steps=0&max_steps=' + max_steps + '&search=' + search;

    if (firstLoad.current) {
      firstLoad.current = false;

      return;
    }

    setUrl(routerUrl);

  }, [page, sort_by, sort_order, search, time_range, max_steps, show_filter]);

  const handleSort = async (column: any, sortDirection: string) => {
    setSort_by(column.id);
    setSort_order(sortDirection);
    const msg = '';

    setHeaderMsg(msg);

  };
  const handlePageChange = (pg: number) => {
    setPage(pg);
  };
  const onSearchInput = (e: any) => {
    setSearch(e.target.value);
  };

  useEffect(() => {
    //if (!router.isReady) return;

    fetchLevels();
  }
  , [fetchLevels]);

  if (router.isFallback) {

    return <SkeletonPage />;
  }

  const columns = [
    {
      id: 'userId',
      name: 'Author',

      selector: (row: any) => row.userId.name,
      cell: (row: any) => <Link href={'profile/' + row.userId._id}><a className='font-bold underline'>{row.userId.name}</a></Link>,
    },
    {
      id: 'name',
      name: 'Name',
      grow: 2,
      selector: (row: any) => row.name,
      ignoreRowClick: true,
      cell: (row: any) => <Link href={'level/' + row.slug}><a className='font-bold underline'>{row.name}</a></Link>,
      conditionalCellStyles: [
        {
          when: (row: any) => row.stats?.userTotal > 0,
          style: (row: any) => ({
            color: row.stats ? row.stats.userTotal === row.stats.total ? 'var(--color-complete)' : 'var(--color-incomplete)' : undefined,
          }),
        },
      ]
    },
    {
      id: 'ts',
      name: 'Created',
      selector: (row: any) => row.ts,
      format: (row: any) => moment.unix(row.ts).fromNow(),
      sortable: true
    },

    {
      grow: 0.45,
      id: 'least_moves',
      name: 'Steps',
      selector: (row: any) => row.leastMoves,
      sortable: true
    },
    {
      id: 'players_beaten',
      name: 'Users Won',

      selector: (row: any) => row.calc_stats_players_beaten || 0,
      sortable: true
    },
    {
      id: 'reviews_score',
      name: 'Review Score',
      selector: (row: any) => row.calc_reviews_score_laplace?.toFixed(2),
      sortField: 'reviews_score',
      sortable: true
    },
  ];

  const defaultClass = 'px-3 py-2.5 bg-blue-600 text-white font-medium text-xs leading-tight hover:bg-blue-700 active:bg-blue-800 transition duration-150 ease-in-out';
  const activeClass = 'px-3 py-2.5 bg-blue-800 text-white font-medium text-xs leading-tight hover:bg-blue-700  active:bg-blue-800 transition duration-150 ease-in-out';
  const defaultClassShowFilter = 'px-3 py-2.5 bg-gray-600 text-white font-medium text-xs leading-tight hover:bg-yellow-700 active:bg-yellow-800 transition duration-150 ease-in-out';
  const activeClassShowFilter = 'px-3 py-2.5 bg-yellow-800 text-white font-medium text-xs leading-tight hover:bg-yellow-700 active:bg-yellow-800 transition duration-150 ease-in-out';
  const onTimeRangeClick = (e: any) => {
    if (time_range === e.target.innerText) {
      setTime_range('all');
    } else {
      setTime_range(e.target.innerText.toLowerCase());
    }
  };
  const onPersonalFilterClick = (e: any) => {
    const dataValue = e.target.getAttribute('data-value');

    if (show_filter === dataValue) {
      setShow_filter('all');
    } else {

      setShow_filter(dataValue);
    }
  };
  const onStepSliderChange = (e: any) => {
    setMax_steps(e.target.value);
  };
  const filterComponent = (
    <>
      <div>{headerMsg}</div>
      <div id='level_search_box'>
        <input onChange={onSearchInput} type="search" id="default-search" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Search..." value={search} />

        <div className="flex items-center justify-center">
          <div>
            <div className="inline-flex shadow-md hover:shadow-lg focus:shadow-lg" role="group">
              <a href="#" onClick={onTimeRangeClick} className={time_range === '24h' ? activeClass : defaultClass}>24h</a>
              <a href="#" onClick={onTimeRangeClick} className={time_range === '7d' ? activeClass : defaultClass}>7d</a>
              <a href="#" onClick={onTimeRangeClick} className={time_range === '30d' ? activeClass : defaultClass}>30d</a>
              <a href="#" onClick={onTimeRangeClick} className={time_range === '365d' ? activeClass : defaultClass}>365d</a>
              <a href="#" onClick={onTimeRangeClick} className={time_range === '' || time_range === 'all' ? activeClass : defaultClass}>All</a>
            </div>
          </div>
          <div className="inline-flex shadow-md hover:shadow-lg focus:shadow-lg" role="group">
            <span className="ml-12"></span>
            <a href="#" data-value='hide_won' onClick={onPersonalFilterClick} className={show_filter === 'hide_won' ? activeClassShowFilter : defaultClassShowFilter}>Hide Won</a>
            <a href="#" data-value='only_attempted' onClick={onPersonalFilterClick} className={show_filter === 'only_attempted' ? activeClassShowFilter : defaultClassShowFilter}>Show Attempted</a>
          </div>
        </div>
        <div className="flex h-10 w-full items-center justify-center">
          <label htmlFor="step-max" className="md:w-1/6 block text-xs font-medium text-white-900 dark:text-gray-300">Max steps</label>

          <input id="step-max" onChange={onStepSliderChange} value={max_steps} step="1" type="number" min="0" max="1000" className="form-range w-16 h32 bg-gray-200 font-medium rounded-lg appearance-none cursor-pointer dark:bg-gray-700       focus:outline-none focus:ring-0 focus:shadow-none"/>
        </div>
      </div>

    </>
  );

  return (
    <Page title={'Search'}>
      <>
        <DataTable
          columns={columns}
          data={data}
          paginationTotalRows={totalRows}
          paginationPerPage={20}
          pagination={true}
          paginationServer
          paginationDefaultPage={page}
          progressPending={loading}
          paginationComponentOptions={{ noRowsPerPage: true }}
          onChangePage={handlePageChange}
          onSort={handleSort}
          sortServer={true}
          defaultSortFieldId={sort_by}
          defaultSortAsc={sort_order === 'asc'}
          theme='dark'
          striped
          dense
          responsive
          persistTableHead
          fixedHeader
          subHeader
          subHeaderComponent={filterComponent}
          subHeaderAlign={Alignment.CENTER}
        />
      </>
    </Page>
  );
}
