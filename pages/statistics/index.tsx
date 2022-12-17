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
import { TimerUtil } from '../../helpers/getTs';
import { logger } from '../../helpers/logger';
import cleanUser from '../../lib/cleanUser';
import dbConnect from '../../lib/dbConnect';
import MultiplayerProfile from '../../models/db/multiplayerProfile';
import User from '../../models/db/user';
import { UserModel } from '../../models/mongoose';
import { USER_DEFAULT_PROJECTION } from '../../models/schemas/userSchema';
import { cleanInput } from '../api/search';

const PAGINATION_PER_PAGE = 25;

interface UserWithStats extends User {
  levelCount: number;
  multiplayerProfile?: MultiplayerProfile;
}

export interface UserSearchQuery extends ParsedUrlQuery {
  hideUnregistered: string;
  page: string;
  search: string;
  showOnline: string;
  sortBy: string;
  sortDir: string;
}

const DEFAULT_QUERY = {
  hideUnregistered: 'false',
  page: '1',
  search: '',
  showOnline: 'false',
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

  const { hideUnregistered, page, search, showOnline, sortBy, sortDir } = searchQuery;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchObj = {} as { [key: string]: any };

  if (search && search.length > 0) {
    searchObj['name'] = {
      $regex: cleanInput(search),
      $options: 'i',
    };
  }

  if (hideUnregistered === 'true') {
    searchObj['ts'] = { $exists: true };
  }

  if (showOnline === 'true') {
    searchObj['hideStatus'] = { $ne: true };

    const onlineThreshold = TimerUtil.getTs() - 15 * 60;

    searchObj['last_visited_at'] = { $gt: onlineThreshold };
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
  else if (sortBy === 'levelCount') {
    sortObj.push(['levelCount', sortDirection]);
  }
  else if (sortBy === 'ratingRushBullet') {
    sortObj.push(['multiplayerProfile.ratingRushBullet', sortDirection]);
  }
  else if (sortBy === 'ratingRushBlitz') {
    sortObj.push(['multiplayerProfile.ratingRushBlitz', sortDirection]);
  }
  else if (sortBy === 'ratingRushRapid') {
    sortObj.push(['multiplayerProfile.ratingRushRapid', sortDirection]);
  }
  else if (sortBy === 'ratingRushClassical') {
    sortObj.push(['multiplayerProfile.ratingRushClassical', sortDirection]);
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
    - reviews (reviewCount, scoreCount, scoreTotal)
    - followers
    */
    const usersAgg = await UserModel.aggregate([
      { $match: searchObj },
      // mulitplayer ratings
      {
        $lookup: {
          from: 'multiplayerprofiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'multiplayerProfile',
        }
      },
      {
        $unwind: {
          path: '$multiplayerProfile',
          preserveNullAndEmptyArrays: true,
        }
      },
      // level count
      {
        $lookup: {
          from: 'levels',
          localField: '_id',
          foreignField: 'userId',
          as: 'levels',
          pipeline: [
            {
              $match: {
                isDraft: false,
              }
            },
            {
              $group: {
                _id: null,
                levelCount: { $sum: 1 },
              }
            },
          ],
        }
      },
      {
        $unwind: {
          path: '$levels',
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $set: {
          levelCount: '$levels.levelCount',
        }
      },
      {
        $unset: 'levels',
      },
      // only keep the fields we need
      {
        $project: {
          ...USER_DEFAULT_PROJECTION,
          calc_records: 1,
          levelCount: 1,
          multiplayerProfile: {
            ratingRushBullet: {
              $cond: {
                if: { $gte: [ '$multiplayerProfile.calcRushBulletCount', 5 ] },
                then: '$multiplayerProfile.ratingRushBullet',
                else: null
              }
            },
            ratingRushBlitz: {
              $cond: {
                if: { $gte: [ '$multiplayerProfile.calcRushBlitzCount', 5 ] },
                then: '$multiplayerProfile.ratingRushBlitz',
                else: null
              }
            },
            ratingRushRapid: {
              $cond: {
                if: { $gte: [ '$multiplayerProfile.calcRushRapidCount', 5 ] },
                then: '$multiplayerProfile.ratingRushRapid',
                else: null
              }
            },
            ratingRushClassical: {
              $cond: {
                if: { $gte: [ '$multiplayerProfile.calcRushClassicalCount', 5 ] },
                then: '$multiplayerProfile.ratingRushClassical',
                else: null
              }
            },
          },
          score: 1,
          ts: 1,
        }
      },
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
    const users = usersAgg[0]?.data as UserWithStats[];

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
  users: UserWithStats[];
}

/* istanbul ignore next */
export default function StatisticsPage({ searchQuery, totalRows, users }: StatisticsProps) {
  const [data, setData] = useState<UserWithStats[]>();
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
      minWidth: '200px',
      selector: row => <FormattedUser size={Dimensions.AvatarSizeSmall} user={row} />,
      sortable: true,
    },
    {
      id: 'score',
      name: 'Completions',
      selector: row => row.score,
      sortable: true,
    },
    {
      id: 'records',
      name: 'Records',
      selector: row => row.calc_records,
      sortable: true,
    },
    {
      id: 'levelCount',
      name: 'Levels',
      selector: row => row.levelCount ?? 0,
      sortable: true,
    },
    {
      id: 'ratingRushBullet',
      name: 'Bullet',
      selector: row => row.multiplayerProfile?.ratingRushBullet || 0,
      format: row => row.multiplayerProfile?.ratingRushBullet ? Math.round(row.multiplayerProfile?.ratingRushBullet) : '-',
      sortable: true,
    },
    {
      id: 'ratingRushBlitz',
      name: 'Blitz',
      selector: row => row.multiplayerProfile?.ratingRushBlitz || 0,
      format: row => row.multiplayerProfile?.ratingRushBlitz ? Math.round(row.multiplayerProfile?.ratingRushBlitz) : '-',
      sortable: true,
    },
    {
      id: 'ratingRushRapid',
      name: 'Rapid',
      selector: row => row.multiplayerProfile?.ratingRushRapid || 0,
      format: row => row.multiplayerProfile?.ratingRushRapid ? Math.round(row.multiplayerProfile?.ratingRushRapid) : '-',
      sortable: true,
    },
    {
      id: 'ratingRushClassical',
      name: 'Classical',
      selector: row => row.multiplayerProfile?.ratingRushClassical || 0,
      format: row => row.multiplayerProfile?.ratingRushClassical ? Math.round(row.multiplayerProfile?.ratingRushClassical) : '-',
      sortable: true,
    },
    {
      id: 'ts',
      name: 'Registered',
      selector: row => row.ts,
      format: row => row.ts ? getFormattedDate(row.ts) : 'Not registered',
      sortable: true,
    },
  ] as TableColumn<UserWithStats>[];

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
        data={data as UserWithStats[]}
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
        onSort={async (column: TableColumn<UserWithStats>, sortDirection: string) => {
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
        subHeaderComponent={<div className='flex flex-col m-2 gap-2'>
          <div>
            <input
              className='form-control relative min-w-0 block w-52 px-3 py-1.5 h-10 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded-md transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none'
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
          <div className='flex flex-row gap-2 justify-center text-sm'>
            <input
              checked={query.hideUnregistered === 'true'}
              name='collection'
              onChange={() => {
                fetchLevels({
                  ...query,
                  hideUnregistered: String(query.hideUnregistered !== 'true'),
                });
              }}
              type='checkbox'
            />
            Hide unregistered
          </div>
          <div className='flex flex-row gap-2 justify-center text-sm'>
            <input
              checked={query.showOnline === 'true'}
              name='collection'
              onChange={() => {
                fetchLevels({
                  ...query,
                  showOnline: String(query.showOnline !== 'true'),
                });
              }}
              type='checkbox'
            />
            Show online
          </div>
          <div className='flex justify-center'>
            <button
              className='italic underline text-sm'
              onClick={() => {
                setQuery({ ...DEFAULT_QUERY });
                fetchLevels({ ...DEFAULT_QUERY });
              }}
            >
              Reset search filters
            </button>
          </div>
        </div>}
      />
    </Page>
  </>);
}
