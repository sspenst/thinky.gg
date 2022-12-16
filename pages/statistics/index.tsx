import debounce from 'debounce';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { ParsedUrlQuery, ParsedUrlQueryInput } from 'querystring';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import DataTable, { Alignment, TableColumn } from 'react-data-table-component';
import FormattedUser from '../../components/formattedUser';
import Page from '../../components/page';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import { DATA_TABLE_CUSTOM_STYLES } from '../../helpers/dataTableCustomStyles';
import getFormattedDate from '../../helpers/getFormattedDate';
import { logger } from '../../helpers/logger';
import cleanUser from '../../lib/cleanUser';
import dbConnect from '../../lib/dbConnect';
import User from '../../models/db/user';
import { UserModel } from '../../models/mongoose';
import { cleanInput } from '../api/search';

const PAGINATION_PER_PAGE = 25;

export interface UserSearchQuery extends ParsedUrlQuery {
  page?: string;
  search?: string;
  sortBy: string;
  sortDir?: string;
}

const DEFAULT_QUERY = {
  page: '1',
  search: '',
  sortBy: 'score',
  sortDir: 'desc',
} as UserSearchQuery;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const searchQuery = { ...DEFAULT_QUERY };

  if (context.query && (Object.keys(context.query).length > 0)) {
    for (const q in context.query as UserSearchQuery) {
      searchQuery[q] = context.query[q];
    }
  }

  const { page, search, sortBy, sortDir } = searchQuery;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchObj = {} as { [key: string]: any };

  if (search && search.length > 0) {
    searchObj['name'] = {
      $regex: cleanInput(search),
      $options: 'i',
    };
  }

  const sortDirection = (sortDir === 'asc') ? 1 : -1;
  const sortObj = [] as [string, number][];

  if (sortBy === 'name') {
    sortObj.push(['name', sortDirection]);
  }
  else if (sortBy === 'score') {
    sortObj.push(['score', sortDirection]);
  }
  else if (sortBy === 'records') {
    sortObj.push(['calc_records', sortDirection]);
  }
  else if (sortBy === 'ts') {
    sortObj.push(['ts', sortDirection]);
  }

  // default sort in case of ties
  if (sortBy !== 'name') {
    sortObj.push(['name', 1]);
  }

  const limit = PAGINATION_PER_PAGE;
  let skip = 0;

  if (page) {
    skip = ((Math.abs(parseInt(page))) - 1) * limit;
  }

  try {
    /*
    TODO:
    - multiplayer ratings
    - reviews (reviewCount, scoreCount, scoreTotal)
    - levels created
    - followers
    */
    const usersAgg = await UserModel.aggregate([
      { $match: searchObj },
      { $sort: sortObj.reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {}) },
      { '$facet': {
        metadata: [ { $count: 'totalRows' } ],
        data: [ { $skip: skip }, { $limit: limit } ]
      } },
      {
        $unwind: {
          path: '$metadata',
          preserveNullAndEmptyArrays: true,
        }
      },
    ]);

    const totalRows = usersAgg[0]?.metadata?.totalRows || 0;
    const users = usersAgg[0]?.data as User[];

    users.forEach(u => cleanUser(u));

    return {
      props: {
        searchQuery: searchQuery,
        totalRows: totalRows,
        users: JSON.parse(JSON.stringify(users)),
      } as StatisticsProps,
    };
  } catch (e) {
    logger.error(e);

    throw new Error('Error querying users');
  }
}

interface StatisticsProps {
  searchQuery: UserSearchQuery;
  totalRows: number;
  users: User[];
}

/* istanbul ignore next */
export default function StatisticsPage({ searchQuery, totalRows, users }: StatisticsProps) {
  const [data, setData] = useState<User[]>();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(searchQuery);
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);

  useEffect(() => {
    setData(users);
    setLoading(false);
  }, [setLoading, users]);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setIsLoading(loading);
  }, [loading, setIsLoading]);

  const fetchLevels = useCallback((query: UserSearchQuery) => {
    setQuery(query);
    setLoading(true);

    // only add non-default query params for a clean URL
    const q: ParsedUrlQueryInput = {};

    for (const prop in query) {
      if (query[prop] !== DEFAULT_QUERY[prop]) {
        q[prop] = query[prop];
      }
    }

    router.push({
      query: q,
    });
  }, [router, setLoading]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queryDebounce = useCallback(
    debounce((q: UserSearchQuery) => {
      fetchLevels(q);
    }, 500),
    []
  );

  const setQueryHelper = useCallback((update: Partial<UserSearchQuery>) => {
    setQuery(q => {
      if (loading) {
        return q;
      }

      const newQ = {
        ...q,
        ...update,
      } as UserSearchQuery;

      queryDebounce(newQ);

      return newQ;
    });
  }, [loading, queryDebounce]);

  const columns = [
    {
      id: 'name',
      name: 'Name',
      minWidth: '150px',
      selector: (row: User) => <FormattedUser size={Dimensions.AvatarSizeSmall} user={row} />,
      sortable: true,
    },
    {
      id: 'score',
      name: 'Completions',
      selector: (row: User) => row.score,
      sortable: true,
    },
    {
      id: 'records',
      name: 'Records',
      selector: (row: User) => row.calc_records,
      sortable: true,
    },
    {
      id: 'ts',
      name: 'Created',
      selector: (row: User) => row.ts,
      format: (row: User) => row.ts ? getFormattedDate(row.ts) : 'Not registered',
      sortable: true,
    },
  ] as TableColumn<User>[];

  // TODO: add a show online button
  // add a show registered button

  const subHeaderComponent = (
    <div className='flex flex-col m-4 gap-2' id='level_search_box'>
      {/* <div className='pt-4 px-4 flex flex-col items-center text-sm text-center'>
        <div>
          {`${statistics.registeredUsersCount.toLocaleString()} registered user${statistics.registeredUsersCount !== 1 ? 's' : ''} (${statistics.currentlyOnlineCount.toLocaleString()} user${statistics.currentlyOnlineCount !== 1 ? 's' : ''} currently online).`}
        </div>
        <div>
          {`${statistics.totalLevelsCount.toLocaleString()} total levels, and ${statistics.totalAttempts.toLocaleString()} total level attempt${statistics.totalAttempts !== 1 ? 's' : ''}!`}
        </div>
      </div> */}
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
          placeholder='Search users...'
          type='search'
          value={query.search}
        />
      </div>
      <button
        className='flex justify-center italic underline text-sm'
        onClick={() => {
          setQuery({ ...DEFAULT_QUERY });
          fetchLevels({ ...DEFAULT_QUERY });
        }}
      >
        Reset search filters
      </button>
    </div>
  );

  return (<>
    <NextSeo
      title={'Statistics - Pathology'}
      canonical={'https://pathology.gg/statistics'}
      openGraph={{
        title: 'Statistics - Pathology',
        type: 'article',
        url: '/statistics',
      }}
    />
    <Page title={'Statistics'}>
      <DataTable
        columns={columns}
        customStyles={DATA_TABLE_CUSTOM_STYLES}
        data={data as User[]}
        defaultSortAsc={query.sortDir === 'asc'}
        defaultSortFieldId={query.sortBy}
        dense
        noDataComponent={
          <div className='p-3'>
            No records to display...
          </div>
        }
        onChangePage={(pg: number) => {
          fetchLevels({
            ...query,
            page: String(pg),
          });
        }}
        onSort={async (column: TableColumn<User>, sortDirection: string) => {
          const update = {
            sortDir: sortDirection,
          } as Partial<UserSearchQuery>;

          if (typeof column.id === 'string') {
            update.sortBy = column.id;
          }

          fetchLevels({
            ...query,
            ...update,
          });
        }}
        pagination={true}
        paginationComponentOptions={{ noRowsPerPage: true }}
        paginationDefaultPage={Number(query.page)}
        paginationPerPage={PAGINATION_PER_PAGE}
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
