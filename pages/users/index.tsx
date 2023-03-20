import debounce from 'debounce';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { ParsedUrlQuery, ParsedUrlQueryInput } from 'querystring';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import DataTable, { Alignment, TableColumn } from 'react-data-table-component';
import FormattedUser from '../../components/formattedUser';
import { getProfileRatingDisplayClean } from '../../components/matchStatus';
import Page from '../../components/page';
import Dimensions from '../../constants/dimensions';
import GraphType from '../../constants/graphType';
import { AppContext } from '../../contexts/appContext';
import { DATA_TABLE_CUSTOM_STYLES } from '../../helpers/dataTableCustomStyles';
import getFormattedDate from '../../helpers/getFormattedDate';
import { TimerUtil } from '../../helpers/getTs';
import { logger } from '../../helpers/logger';
import dbConnect from '../../lib/dbConnect';
import MultiplayerProfile from '../../models/db/multiplayerProfile';
import User from '../../models/db/user';
import { UserModel } from '../../models/mongoose';
import { MultiplayerMatchType } from '../../models/MultiplayerEnums';
import { cleanInput } from '../api/search';

const PAGINATION_PER_PAGE = 40;

interface UserWithStats extends User {
  followerCount: number;
  index: number;
  ratingRushBullet: number;
  ratingRushBlitz: number;
  ratingRushRapid: number;
  ratingRushClassical: number;
  reviewAverage: number;
  reviewCount: number;
}

export interface UserSearchQuery extends ParsedUrlQuery {
  page: string;
  search: string;
  showOnline: string;
  showUnregistered: string;
  sortBy: string;
  sortDir: string;
}

export const DEFAULT_QUERY = {
  page: '1',
  search: '',
  showOnline: 'false',
  showUnregistered: 'false',
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

  const { page, search, showOnline, showUnregistered, sortBy, sortDir } = searchQuery;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchObj = {} as { [key: string]: any };

  if (search && search.length > 0) {
    searchObj['name'] = {
      $regex: cleanInput(search),
      $options: 'i',
    };
  }

  if (showUnregistered !== 'true') {
    searchObj['ts'] = { $exists: true };
  }

  if (showOnline === 'true') {
    searchObj['hideStatus'] = { $ne: true };
    searchObj['last_visited_at'] = { $gt: TimerUtil.getTs() - 5 * 60 };
  }

  const sortObj = [[sortBy, sortDir === 'asc' ? 1 : -1]];

  if (sortBy === 'ratingRushBullet' || sortBy === 'ratingRushBlitz' || sortBy === 'ratingRushRapid' || sortBy === 'ratingRushClassical') {
    // sort by total games
    // replace rating with calc
    const countField = sortBy.replace('rating', 'calc');

    sortObj.push([countField + 'Count', -1]);
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
      // follower count
      {
        $lookup: {
          from: 'graphs',
          localField: '_id',
          foreignField: 'target',
          as: 'followers',
          pipeline: [
            {
              $match: {
                type: GraphType.FOLLOW,
              }
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              }
            },
          ],
        }
      },
      {
        $unwind: {
          path: '$followers',
          preserveNullAndEmptyArrays: true,
        }
      },
      // review counts
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'userId',
          as: 'reviews',
          pipeline: [
            {
              $project: {
                hasScore: {
                  $cond: [{ $gt: ['$score', 0] }, 1, 0]
                },
                isDeleted: 1,
                score: 1,
                userId: 1,
              },
            },
            { $match: { isDeleted: { $ne: true } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                scoreCount: { $sum: '$hasScore' },
                scoreTotal: { $sum: '$score' },
              },
            },
          ],
        }
      },
      {
        $unwind: {
          path: '$reviews',
          preserveNullAndEmptyArrays: true,
        }
      },
      // only keep the fields we need
      {
        $project: {
          _id: 1,
          avatarUpdatedAt: 1,
          calc_levels_created_count: 1,
          calc_records: 1,
          followerCount: '$followers.count',
          last_visited_at: {
            $cond: {
              if: { $eq: [ '$hideStatus', true ] },
              then: null,
              else: '$last_visited_at',
            }
          },
          name: 1,
          calcRushBulletCount: '$multiplayerProfile.calcRushBulletCount',
          calcRushBlitzCount: '$multiplayerProfile.calcRushBlitzCount',
          calcRushRapidCount: '$multiplayerProfile.calcRushRapidCount',
          calcRushClassicalCount: '$multiplayerProfile.calcRushClassicalCount',
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
          reviewAverage: {
            $cond: {
              if: { $ne: [ '$reviews.scoreCount', 0 ] },
              then: { $divide: [ '$reviews.scoreTotal', '$reviews.scoreCount' ] },
              else: null
            }
          },
          reviewCount: '$reviews.count',
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

    users.forEach((user, index) => {
      user.index = index + 1 + skip;
    });

    return {
      props: {
        searchQuery: searchQuery,
        totalRows: totalRows,
        users: JSON.parse(JSON.stringify(users)),
      } as PlayersProps,
    };
  } catch (e) {
    logger.error(e);

    throw new Error('Error querying users');
  }
}

interface PlayersProps {
  searchQuery: UserSearchQuery;
  totalRows: number;
  users: UserWithStats[];
}

/* istanbul ignore next */
export default function PlayersPage({ searchQuery, totalRows, users }: PlayersProps) {
  const [data, setData] = useState<UserWithStats[]>();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(searchQuery);
  const router = useRouter();
  const { user } = useContext(AppContext);

  useEffect(() => {
    setData(users);
    setLoading(false);
  }, [setLoading, users]);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

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
      id: 'index',
      name: '#',
      width: '60px',
      selector: row => row.index,
    },
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
      id: 'calc_levels_created_count',
      name: 'Levels',
      selector: row => row.calc_levels_created_count ?? 0,
      sortable: true,
    },
    {
      id: 'calc_records',
      name: 'Records',
      selector: row => row.calc_records,
      sortable: true,
    },
    {
      id: 'reviewCount',
      name: 'Reviews',
      selector: row => row.reviewCount ?? 0,
      sortable: true,
    },
    {
      id: 'last_visited_at',
      name: 'Last Seen',
      minWidth: '128px',
      selector: row => row.ts,
      format: row => row.last_visited_at ? getFormattedDate(row.last_visited_at) : '-',
      sortable: true,
    },
    {
      id: 'ts',
      name: 'Registered',
      minWidth: '128px',
      selector: row => row.ts,
      format: row => row.ts ? getFormattedDate(row.ts) : 'Not registered',
      sortable: true,
    },
    {
      id: 'reviewAverage',
      name: 'Avg Review',
      selector: row => row.reviewAverage ? Math.round(row.reviewAverage * 100) / 100 : '-',
      sortable: true,
    },
    {
      id: 'followerCount',
      name: 'Followers',
      selector: row => row.followerCount ?? 0,
      sortable: true,
    },
    {
      id: 'ratingRushBullet',
      name: 'Bullet',
      selector: row => row.ratingRushBullet || 0,
      format: row => getProfileRatingDisplayClean(MultiplayerMatchType.RushBullet, row as unknown as MultiplayerProfile),
      sortable: true,
      allowOverflow: true,
    },
    {
      id: 'ratingRushBlitz',
      name: 'Blitz',
      selector: row => row.ratingRushBlitz || 0,
      format: row => getProfileRatingDisplayClean(MultiplayerMatchType.RushBlitz, row as unknown as MultiplayerProfile),
      sortable: true,
      allowOverflow: true,
    },
    {
      id: 'ratingRushRapid',
      name: 'Rapid',
      selector: row => row.ratingRushRapid || 0,
      format: row => getProfileRatingDisplayClean(MultiplayerMatchType.RushRapid, row as unknown as MultiplayerProfile),
      sortable: true,
      allowOverflow: true,
    },
    {
      id: 'ratingRushClassical',
      name: 'Classical',
      selector: row => row.ratingRushClassical || 0,
      format: row => getProfileRatingDisplayClean(MultiplayerMatchType.RushClassical, row as unknown as MultiplayerProfile),
      sortable: true,
      allowOverflow: true,
    },
  ] as TableColumn<UserWithStats>[];

  return (<>
    <NextSeo
      title={'Users - Pathology'}
      canonical={'https://pathology.gg/users'}
      openGraph={{
        title: 'Users - Pathology',
        type: 'article',
        url: '/users',
      }}
    />
    <Page title={'Users'}>
      <DataTable
        columns={columns}
        conditionalRowStyles={[{
          when: row => row._id === user?._id,
          style: {
            backgroundColor: 'var(--bg-color-4)',
          },
        }]}
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
              checked={query.showOnline === 'true'}
              id='showOnline'
              name='collection'
              onChange={() => {
                fetchLevels({
                  ...query,
                  showOnline: String(query.showOnline !== 'true'),
                });
              }}
              type='checkbox'
            />
            <label htmlFor='showOnline'>
              Show online
            </label>
          </div>
          <div className='flex flex-row gap-2 justify-center text-sm'>
            <input
              checked={query.showUnregistered === 'true'}
              id='showUnregistered'
              name='collection'
              onChange={() => {
                fetchLevels({
                  ...query,
                  showUnregistered: String(query.showUnregistered !== 'true'),
                });
              }}
              type='checkbox'
            />
            <label htmlFor='showUnregistered'>
              Show unregistered
            </label>
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
