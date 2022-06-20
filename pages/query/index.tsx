import { NextRouter, useRouter } from 'next/router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import query, { doQuery } from '../api/levels/query';

import DataTable from 'react-data-table-component';
import Level from '../../models/db/level';
import Link from 'next/link';
import Page from '../../components/page';
import SkeletonPage from '../../components/skeletonPage';
import StatsHelper from '../../helpers/statsHelper';
import dbConnect from '../../lib/dbConnect';
import moment from 'moment';
import usePush from '../../hooks/usePush';
import useStats from '../../hooks/useStats';

export async function getServerSideProps(context:any) {
  await dbConnect();

  let q = { sort_by: 'ts' };

  if (context.query) {
    q = context.query;
  }

  const query = await doQuery(q);

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

  levels = enrichWithStats(levels);
  const [data, setData] = useState(levels);
  const [headerMsg, setHeaderMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(total);

  const [search, setSearch] = useState(queryParams?.search || '');
  const [sort_by, setSort_by] = useState(queryParams?.sort_by || 'ts');
  const [sort_order, setSort_order] = useState(queryParams?.sort_dir || 'desc');
  const [page, setPage] = useState(queryParams.page ? parseInt(router.query.page as string) : 1);
  const [url, setUrl] = useState(router.asPath.substring(1, router.asPath.length));

  // enrich the data that comes with the page
  useEffect(() => {
    setData(enrichWithStats(levels));
  }, [levels, enrichWithStats]);
  // @TODO: enrich the data in getStaticProps.
  useEffect(() => {
    console.log(url);
    routerPush('/' + url);
  }, [url, routerPush]);
  const fetchLevels = useCallback(async () => {

    //const qurl = 'query?page=' + (page - 1) + '&sort_by=' + sort_by + '&sort_dir=' + sort_order + '&search=' + search;
    const routerUrl = 'query?page=' + (page) + '&sort_by=' + sort_by + '&sort_dir=' + sort_order + '&search=' + search ;

    setUrl(routerUrl);

  }, [page, sort_by, sort_order, search]);

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
    if (!router.isReady) return;

    fetchLevels();
  }
  , [fetchLevels, router.isReady]);

  if (router.isFallback) {

    return <SkeletonPage/>;
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
  const conditionalRowStyles = [
    {
      when: (row: any) => row.stats?.userTotal > 0,
      style: (row: any) => ({
        backgroundColor: row.stats.userTotal > row.stats.total ? 'lightyellow' : 'gray',
        color: 'black'
      }),
    },
  ];

  return (
    <Page title={'Query'}>
      <>
        <div>{headerMsg}</div>
        <div id='level_search_box'>
          <input onChange={onSearchInput} type="search" id="default-search" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Search..." value={search} />
        </div>
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
          conditionalRowStyles={conditionalRowStyles}
          theme="dark"
          striped
          dense
          responsive
          persistTableHead
          fixedHeader
        />

      </>
    </Page>
  );
}
