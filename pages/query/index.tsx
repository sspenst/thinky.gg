import React, { useCallback, useEffect, useState } from 'react';
import DataTable from 'react-data-table-component';
import Level from '../../models/db/level';
import Link from 'next/link';
import Page from '../../components/page';
import StatsHelper from '../../helpers/statsHelper';
import dbConnect from '../../lib/dbConnect';
import { doQuery } from '../api/levels/query';
import moment from 'moment';
import useStats from '../../hooks/useStats';

export async function getStaticProps() {
  await dbConnect();

  const query = await doQuery({ sort_by: 'ts' });

  if (!query) {
    throw new Error('Error finding Levels');
  }

  return {
    props: {
      total: query?.total,
      levels: JSON.parse(JSON.stringify(query.data)),
    } as CatalogProps,
    revalidate: 60 * 60,
  };
}

interface CatalogProps {
    total:number,
  levels: Level[];
}

export default function Catalog({ total, levels }: CatalogProps) {
  const { stats } = useStats();

  const getOptions = useCallback(() => {
    if (!levels) {
      return [];
    }

    return (
      levels
    );
  }, [levels, stats]);

  const [data, setData] = useState(levels);
  const [headerMsg, setHeaderMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(total);
  const [sort_by, setSort_by] = useState('ts');
  const [sort_order, setSort_order] = useState('desc');
  const [page, setPage] = useState(1);

  const enrichWithStats = useCallback((levels:any) =>{
    const levelStats = StatsHelper.levelStats(levels, stats);

    for (let i = 0 ; i < levels.length;i++) {
      levels[i].stats = levelStats[i];
    }

    return levels;
  }, [stats]);

  // enrich the data that comes with the page
  levels = enrichWithStats(levels);
  // @TODO: enrich the data in getStaticProps.
  const fetchLevels = useCallback (async () => {
    setLoading(true);
    const fet = await fetch('/api/levels/query?page=' + (page - 1) + '&sort_by=' + sort_by + '&sort_dir=' + sort_order);

    const response = await fet.json();

    response.data = enrichWithStats(response.data);

    setData(response.data);
    setTotalRows(response.total);
    setLoading(false);
  }, [enrichWithStats, page, sort_by, sort_order]);
  const handleSort = async (column:any, sortDirection:string) => {
    setSort_by(column.id);
    setSort_order(sortDirection);
    const msg = '';

    setHeaderMsg(msg);

  };
  const handlePageChange = (page:number) => {
    setPage(page);

  };

  useEffect(() => {
    fetchLevels();
  }
  , [fetchLevels]);

  const columns = [
    {
      name: 'Name',
      selector: (row:any) => row.name,
      ignoreRowClick: true,
      cell: (row:any) => <Link href={'level/' + row.slug}>{row.name}</Link>,
    },
    {
      id: 'ts',
      name: 'Created',
      selector: (row:any) => row.ts,
      format: (row:any) => moment.unix(row.ts).fromNow(),
      sortable: true
    },
    {
      name: 'Author',
      selector: (row:any) => row.userId.name,
    },
    {
      name: 'Moves',
      selector: (row:any) => row.leastMoves,
    },
    {
      name: 'Players Completed',
      selector: (row:any) => row.calc_stats_players_beaten || 0,
    },
    {
      id: 'reviews_score',
      name: 'Rating',
      selector: (row:any) => row.calc_reviews_score_laplace.toFixed(2),
      sortField: 'reviews_score',
      sortable: true
    },
  ];
  const conditionalRowStyles = [
    {
      when: (row:any) => row.stats?.userTotal > 0,
      style: (row:any) => ({
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
