import { NextRouter, useRouter } from 'next/router';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import DataTable from 'react-data-table-component';
import Level from '../../models/db/level';
import Link from 'next/link';
import Page from '../../components/page';
import SkeletonPage from '../../components/skeletonPage';
import StatsHelper from '../../helpers/statsHelper';
import dbConnect from '../../lib/dbConnect';
import { doQuery } from '../api/levels/query';
import moment from 'moment';
import usePush from '../../hooks/usePush';
import useStats from '../../hooks/useStats';

export async function getServerSideProps(context:any) {
  await dbConnect();

  const query = await doQuery({ sort_by: 'ts' });

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
  const [data, setData] = useState(levels);
  const [headerMsg, setHeaderMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(total);

  const [sort_by, setSort_by] = useState(queryParams?.sort_by || 'ts');
  const [sort_order, setSort_order] = useState(queryParams?.sort_dir || 'desc');
  const [page, setPage] = useState(queryParams.page ? parseInt(router.query.page as string) : 1);

  const enrichWithStats = useCallback((levels: any) => {
    const levelStats = StatsHelper.levelStats(levels, stats);

    for (let i = 0; i < levels.length; i++) {
      levels[i].stats = levelStats[i];
    }

    return levels;
  }, [stats]);

  // enrich the data that comes with the page
  levels = enrichWithStats(levels);
  // @TODO: enrich the data in getStaticProps.
  const fetchLevels = useCallback(async () => {
    setLoading(true);
    const url = 'query?page=' + (page - 1) + '&sort_by=' + sort_by + '&sort_dir=' + sort_order;

    const fet = await fetch('/api/levels/' + url);

    const routerUrl = 'query?page=' + page + '&sort_by=' + sort_by + '&sort_dir=' + sort_order;

    routerPush('/' + routerUrl);
    const response = await fet.json();

    response.data = enrichWithStats(response.data);

    setData(response.data);
    setTotalRows(response.total);
    setLoading(false);
  }, [enrichWithStats, routerPush, page, sort_by, sort_order]);

  const handleSort = async (column: any, sortDirection: string) => {
    setSort_by(column.id);
    setSort_order(sortDirection);
    const msg = '';

    setHeaderMsg(msg);

  };
  const handlePageChange = (pg: number) => {
    setPage(pg);
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
      name: 'Author',
      selector: (row: any) => row.userId.name,
      cell: (row: any) => <Link href={'profile/' + row.userId._id}><a className='font-bold underline'>{row.userId.name}</a></Link>,
    },
    {
      name: 'Name',
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
      name: 'Moves',
      selector: (row: any) => row.leastMoves,
    },
    {
      id: 'players_beaten',
      name: 'Players Completed',
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
        backgroundColor: row.stats.userTotal > row.stats.total ? 'lightyellow' : 'lightgreen',
      }),
    },
  ];

  return (
    <Page title={'Query'}>
      <>
        <div>{headerMsg}</div>
        <DataTable
          columns={columns}
          data={data}
          paginationTotalRows={totalRows}
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
          striped
          dense
        />

      </>
    </Page>
  );
}
