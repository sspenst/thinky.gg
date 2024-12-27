import FormattedDate from '@root/components/formatted/formattedDate';
import MultiplayerRating from '@root/components/multiplayer/multiplayerRating';
import DataTable, { TableColumn } from '@root/components/tables/dataTable';
import { GameType } from '@root/constants/Games';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import useRouterQuery from '@root/hooks/useRouterQuery';
import cleanUser from '@root/lib/cleanUser';
import debounce from 'debounce';
import { Loader } from 'lucide-react';
import { GetServerSidePropsContext } from 'next';
import { NextSeo } from 'next-seo';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import FormattedUser from '../../../components/formatted/formattedUser';
import Page from '../../../components/page/page';
import Dimensions from '../../../constants/dimensions';
import GraphType from '../../../constants/graphType';
import { AppContext } from '../../../contexts/appContext';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import { MultiplayerMatchType } from '../../../models/constants/multiplayer';
import MultiplayerProfile from '../../../models/db/multiplayerProfile';
import User from '../../../models/db/user';
import { GraphModel, MultiplayerProfileModel, ReviewModel, UserModel } from '../../../models/mongoose';
import { cleanInput } from '../../api/search';

const ITEMS_PER_PAGE = 40;

interface UserWithStats extends User {
  followerCount: number;
  index: number;
  calcLevelsSolvedCount: number;
  calcLevelsCompletedCount: number;
  calcRankedSolves: number;
  calcLevelsCreatedCount: number;
  calcCurrentStreak: number;
  lastPlayedAt: number;
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
  showNotRegistered: string;
  sortBy: string;
  sortDir: 'desc' | 'asc';
  tab: UserTableTab;
}

enum UserTableTab {
  GENERAL = 'general',
  FOLLOWERS = 'followers',
  MULTIPLAYER = 'multiplayer',
  STREAKS = 'streaks'
}
export const DEFAULT_QUERY = {
  page: '1',
  search: '',
  showNotRegistered: 'false',
  sortBy: 'calcLevelsSolvedCount',
  sortDir: 'desc',
  tab: UserTableTab.GENERAL,
} as UserSearchQuery & { tab: UserTableTab };

const USER_TABLE_TABS = [
  UserTableTab.GENERAL,
  UserTableTab.FOLLOWERS,
  UserTableTab.MULTIPLAYER,
  UserTableTab.STREAKS,
];

// First, let's create a constant for default sort settings per tab
const TAB_DEFAULT_SORTS = {
  [UserTableTab.GENERAL]: {
    sortBy: 'calcLevelsSolvedCount',
    sortDir: 'desc' as const,
  },
  [UserTableTab.FOLLOWERS]: {
    sortBy: 'followerCount',
    sortDir: 'desc' as const,
  },
  [UserTableTab.MULTIPLAYER]: {
    sortBy: 'ratingRushBullet',
    sortDir: 'desc' as const,
  },
  [UserTableTab.STREAKS]: {
    sortBy: 'calcCurrentStreak',
    sortDir: 'desc' as const,
  },
};

// Add this before the sortPipeline definition
const sortFieldMap: { [key: string]: string } = {
  'reviewAverage': 'sortReviewAverage',
  'last_visited_at': 'sortLastSeen',
  'followerCount': 'sortFollowerCount',
  'ratingRushBullet': 'sortRatingRushBullet',
  'ratingRushBlitz': 'sortRatingRushBlitz',
  'ratingRushRapid': 'sortRatingRushRapid',
  'ratingRushClassical': 'sortRatingRushClassical',
  'reviewCount': 'sortReviewCount',
  // Add mappings for the flattened fields
  'calcLevelsSolvedCount': 'calcLevelsSolvedCount',
  'calcLevelsCompletedCount': 'calcLevelsCompletedCount',
  'calcRankedSolves': 'calcRankedSolves',
  'calcLevelsCreatedCount': 'calcLevelsCreatedCount',
  'calcCurrentStreak': 'calcCurrentStreak'
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const gameId = getGameIdFromReq(context.req);
  const game = getGameFromId(gameId);

  DEFAULT_QUERY.sortBy = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calcLevelsCompletedCount' : 'calcLevelsSolvedCount';
  const searchQuery = { ...DEFAULT_QUERY };

  if (context.query && (Object.keys(context.query).length > 0)) {
    for (const q in context.query as UserSearchQuery) {
      searchQuery[q] = context.query[q];
    }
  }

  const { page, search, showNotRegistered, sortBy, sortDir, tab } = searchQuery;

  // Ensure valid sort parameters
  const defaultSort = TAB_DEFAULT_SORTS[tab as UserTableTab] || TAB_DEFAULT_SORTS[UserTableTab.GENERAL];
  const validatedSortBy = sortBy || defaultSort.sortBy;
  const validatedSortDir = (sortDir === 'asc' || sortDir === 'desc') ? sortDir : defaultSort.sortDir;

  // Initialize search conditions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchObj = {} as { [key: string]: any };

  // Add name search condition
  if (search && search.length > 0) {
    searchObj['name'] = {
      $regex: cleanInput(search),
      $options: 'i',
    };
  }

  // Add registered users condition
  if (showNotRegistered !== 'true') {
    searchObj['ts'] = { $exists: true };
  }

  const sortObj = [[validatedSortBy, validatedSortDir === 'asc' ? 1 : -1]];

  // if we are sorting by completion then make the second order sort by solves
  if (validatedSortBy === 'calcLevelsCompletedCount') {
    sortObj.push(['calcLevelsSolvedCount', -1]);
  } else if (validatedSortBy === 'calcLevelsSolvedCount') {
    sortObj.push(['calcLevelsCompletedCount', -1]);
  } else if (validatedSortBy === 'ratingRushBullet' || validatedSortBy === 'ratingRushBlitz' || validatedSortBy === 'ratingRushRapid' || validatedSortBy === 'ratingRushClassical') {
    // sort by total games
    const countField = validatedSortBy.replace('rating', 'calc');

    sortObj.push([countField + 'Count', -1]);
  }

  // default sort in case of ties
  if (validatedSortBy !== 'name') {
    sortObj.push(['name', 1]);
  }

  const limit = ITEMS_PER_PAGE;
  let skip = 0;

  if (page) {
    skip = ((Math.abs(parseInt(page))) - 1) * limit;
  }

  try {
    // Base pipeline that always runs
    const basePipeline = [
      { $match: searchObj },
      ...getEnrichUserConfigPipelineStage(gameId, {
        project: {
          calcLevelsSolvedCount: 1,
          calcLevelsCompletedCount: 1,
          calcRankedSolves: 1,
          calcLevelsCreatedCount: 1,
          calcCurrentStreak: 1,
          lastPlayedAt: 1,
        }
      }),
      // Add streak filtering here, after we have the config data
      ...(tab === UserTableTab.STREAKS ? [{
        $match: {
          $expr: {
            $and: [
              { $gt: ['$config.calcCurrentStreak', 0] },
              {
                $gte: [
                  '$config.lastPlayedAt',
                  (() => {
                    const ONE_DAY = 24 * 60 * 60 * 1000;
                    const today = new Date();

                    today.setHours(0, 0, 0, 0);

                    return today.getTime() - ONE_DAY;
                  })()
                ]
              }
            ]
          }
        }
      }] : []),
    ];

    // Optional lookups based on sort field
    const optionalLookups = [];

    if (tab === UserTableTab.MULTIPLAYER || (tab === UserTableTab.GENERAL && validatedSortBy.startsWith('ratingRush'))) {
      optionalLookups.push(
        {
          $lookup: {
            from: MultiplayerProfileModel.collection.name,
            localField: '_id',
            foreignField: 'userId',
            as: 'multiplayerProfile',
            pipeline: [{ $match: { gameId: gameId } }],
          }
        },
        {
          $unwind: {
            path: '$multiplayerProfile',
            preserveNullAndEmptyArrays: true,
          }
        },
        ...(validatedSortBy.startsWith('ratingRush') ? [{
          $match: {
            [`multiplayerProfile.${validatedSortBy.replace('rating', 'calc')}Count`]: {
              $gte: 5
            }
          }
        }] : [])
      );
    }

    if (tab === UserTableTab.FOLLOWERS || (tab === UserTableTab.GENERAL && validatedSortBy === 'followerCount')) {
      optionalLookups.push(
        {
          $lookup: {
            from: GraphModel.collection.name,
            localField: '_id',
            foreignField: 'target',
            as: 'followers',
            pipeline: [
              { $match: { type: GraphType.FOLLOW } },
              { $group: { _id: null, count: { $sum: 1 } } }
            ],
          }
        },
        {
          $unwind: {
            path: '$followers',
            preserveNullAndEmptyArrays: true,
          }
        }
      );
    }

    if (tab === UserTableTab.GENERAL && (validatedSortBy === 'reviewAverage' || validatedSortBy === 'reviewCount')) {
      optionalLookups.push(
        {
          $lookup: {
            from: ReviewModel.collection.name,
            localField: '_id',
            foreignField: 'userId',
            as: 'reviews',
            pipeline: [
              { $match: { gameId: gameId, isDeleted: { $ne: true } } },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  scoreCount: { $sum: { $cond: [{ $gt: ['$score', 0] }, 1, 0] } },
                  scoreTotal: { $sum: '$score' },
                }
              }
            ],
          }
        },
        {
          $unwind: {
            path: '$reviews',
            preserveNullAndEmptyArrays: true,
          }
        }
      );
    }

    const sortPipeline = [
      // Add computed fields needed for sorting before the actual sort
      {
        $addFields: {
          // Fix review average sorting
          sortReviewAverage: {
            $cond: {
              if: { $ne: [ '$reviews.scoreCount', 0 ] },
              then: { $divide: [ '$reviews.scoreTotal', '$reviews.scoreCount' ] },
              else: -1 // Put null reviews at the bottom when sorting
            }
          },
          // Fix last seen sorting - respect hideStatus
          sortLastSeen: {
            $cond: {
              if: { $eq: [ '$hideStatus', true ] },
              then: -1, // Put hidden status at bottom when sorting
              else: '$last_visited_at'
            }
          },
          // Fix follower count sorting
          sortFollowerCount: { $ifNull: ['$followers.count', 0] },
          // Fix rating sorting
          sortRatingRushBullet: {
            $cond: {
              if: { $gte: [ '$multiplayerProfile.calcRushBulletCount', 5 ] },
              then: '$multiplayerProfile.ratingRushBullet',
              else: -1
            }
          },
          sortRatingRushBlitz: {
            $cond: {
              if: { $gte: [ '$multiplayerProfile.calcRushBlitzCount', 5 ] },
              then: '$multiplayerProfile.ratingRushBlitz',
              else: -1
            }
          },
          sortRatingRushRapid: {
            $cond: {
              if: { $gte: [ '$multiplayerProfile.calcRushRapidCount', 5 ] },
              then: '$multiplayerProfile.ratingRushRapid',
              else: -1
            }
          },
          sortRatingRushClassical: {
            $cond: {
              if: { $gte: [ '$multiplayerProfile.calcRushClassicalCount', 5 ] },
              then: '$multiplayerProfile.ratingRushClassical',
              else: -1
            }
          },
          // Fix review count sorting
          sortReviewCount: { $ifNull: ['$reviews.count', 0] },
          // Add the flattened config fields
          calcLevelsSolvedCount: '$config.calcLevelsSolvedCount',
          calcLevelsCompletedCount: '$config.calcLevelsCompletedCount',
          calcRankedSolves: '$config.calcRankedSolves',
          calcLevelsCreatedCount: '$config.calcLevelsCreatedCount',
          calcCurrentStreak: '$config.calcCurrentStreak'
        }
      },
      // Modify sort object to use computed fields
      {
        $sort: {
          ...sortObj.reduce((acc, cur) => {
            const field = cur[0];
            const direction = cur[1];

            // Use the field directly if it's not in the map
            const sortField = sortFieldMap[field] || field;

            return {
              ...acc,
              [sortField]: direction
            };
          }, {})
        }
      },
      { $skip: skip },
      { $limit: limit },
      // Remove the temporary sort fields
      {
        $project: {
          sortReviewAverage: 0,
          sortLastSeen: 0,
          sortFollowerCount: 0,
          sortRatingRushBullet: 0,
          sortRatingRushBlitz: 0,
          sortRatingRushRapid: 0,
          sortRatingRushClassical: 0,
          sortReviewCount: 0
        }
      }
    ];

    // Add remaining lookups after limiting results
    const postLimitLookups: any[] = [];

    if (tab === UserTableTab.MULTIPLAYER || (tab === UserTableTab.GENERAL && validatedSortBy.startsWith('ratingRush'))) {
      postLimitLookups.push(
        {
          $lookup: {
            from: MultiplayerProfileModel.collection.name,
            localField: '_id',
            foreignField: 'userId',
            as: 'multiplayerProfile',
            pipeline: [{ $match: { gameId: gameId } }],
          }
        },
        {
          $unwind: {
            path: '$multiplayerProfile',
            preserveNullAndEmptyArrays: true,
          }
        }
      );
    }

    if (tab === UserTableTab.FOLLOWERS || (tab === UserTableTab.GENERAL && validatedSortBy === 'followerCount')) {
      postLimitLookups.push(
        {
          $lookup: {
            from: GraphModel.collection.name,
            localField: '_id',
            foreignField: 'target',
            as: 'followers',
            pipeline: [
              { $match: { type: GraphType.FOLLOW } },
              { $group: { _id: null, count: { $sum: 1 } } }
            ],
          }
        },
        {
          $unwind: {
            path: '$followers',
            preserveNullAndEmptyArrays: true,
          }
        }
      );
    }

    if (tab === UserTableTab.GENERAL && (validatedSortBy === 'reviewAverage' || validatedSortBy === 'reviewCount')) {
      postLimitLookups.push(
        {
          $lookup: {
            from: ReviewModel.collection.name,
            localField: '_id',
            foreignField: 'userId',
            as: 'reviews',
            pipeline: [
              { $match: { gameId: gameId, isDeleted: { $ne: true } } },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  scoreCount: { $sum: { $cond: [{ $gt: ['$score', 0] }, 1, 0] } },
                  scoreTotal: { $sum: '$score' },
                }
              }
            ],
          }
        },
        {
          $unwind: {
            path: '$reviews',
            preserveNullAndEmptyArrays: true,
          }
        }
      );
    }

    const users = await UserModel.aggregate([
      ...basePipeline,
      {
        $count: 'totalRows'
      }
    ]);

    const totalRows = users[0]?.totalRows || 0;

    const usersAgg = await UserModel.aggregate([
      ...basePipeline,
      ...optionalLookups,
      ...sortPipeline,
      ...postLimitLookups,
      {
        $project: {
          _id: 1,
          avatarUpdatedAt: 1,
          hideStatus: 1,
          name: 1,
          roles: 1,
          ts: 1,
          // Reference the fields directly instead of through config
          calcLevelsSolvedCount: '$config.calcLevelsSolvedCount',
          calcLevelsCompletedCount: '$config.calcLevelsCompletedCount',
          calcRankedSolves: '$config.calcRankedSolves',
          calcLevelsCreatedCount: '$config.calcLevelsCreatedCount',
          calcCurrentStreak: '$config.calcCurrentStreak',
          lastPlayedAt: '$config.lastPlayedAt',
          // Rest of the fields
          last_visited_at: {
            $cond: {
              if: { $eq: ['$hideStatus', true] },
              then: null,
              else: '$last_visited_at'
            }
          },
          followerCount: { $ifNull: ['$followers.count', 0] },
          ratingRushBullet: {
            $cond: {
              if: { $gte: ['$multiplayerProfile.calcRushBulletCount', 5] },
              then: '$multiplayerProfile.ratingRushBullet',
              else: null
            }
          },
          ratingRushBlitz: {
            $cond: {
              if: { $gte: ['$multiplayerProfile.calcRushBlitzCount', 5] },
              then: '$multiplayerProfile.ratingRushBlitz',
              else: null
            }
          },
          ratingRushRapid: {
            $cond: {
              if: { $gte: ['$multiplayerProfile.calcRushRapidCount', 5] },
              then: '$multiplayerProfile.ratingRushRapid',
              else: null
            }
          },
          ratingRushClassical: {
            $cond: {
              if: { $gte: ['$multiplayerProfile.calcRushClassicalCount', 5] },
              then: '$multiplayerProfile.ratingRushClassical',
              else: null
            }
          },
          calcRushBulletCount: '$multiplayerProfile.calcRushBulletCount',
          calcRushBlitzCount: '$multiplayerProfile.calcRushBlitzCount',
          calcRushRapidCount: '$multiplayerProfile.calcRushRapidCount',
          calcRushClassicalCount: '$multiplayerProfile.calcRushClassicalCount',
        }
      }
    ]);

    usersAgg.forEach((user, index) => {
      user.index = index + 1 + skip;
      cleanUser(user);
    });

    return {
      props: {
        searchQuery: searchQuery,
        totalRows: totalRows,
        users: JSON.parse(JSON.stringify(usersAgg)),
      } as PlayersProps,
    };
  } catch (e) {
    logger.error(e);
    throw new Error('Error querying users');
  }
}

interface PlayersProps {
  searchQuery: UserSearchQuery & { tab: UserTableTab };
  totalRows: number;
  users: UserWithStats[];
}

/* istanbul ignore next */
export default function PlayersPage({ searchQuery, totalRows, users }: PlayersProps) {
  const [data, setData] = useState<UserWithStats[]>();
  const { game, user } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(searchQuery);
  const routerQuery = useRouterQuery();
  const [tabChanging, setTabChanging] = useState(false);

  DEFAULT_QUERY.sortBy = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calcLevelsCompletedCount' : 'calcLevelsSolvedCount';

  useEffect(() => {
    setData(users);
    setLoading(false);
    setTabChanging(false);
  }, [setLoading, users]);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  const fetchLevels = useCallback((query: UserSearchQuery) => {
    const updatedQuery = { ...query };
    const isTabChange = query.tab !== searchQuery.tab;

    // Always ensure we have a valid sort
    if (isTabChange || !updatedQuery.sortBy) {
      const defaultSort = TAB_DEFAULT_SORTS[query.tab as UserTableTab] || TAB_DEFAULT_SORTS[UserTableTab.GENERAL];

      updatedQuery.sortBy = defaultSort.sortBy;
      updatedQuery.sortDir = defaultSort.sortDir;
    }

    setQuery(updatedQuery);

    if (isTabChange) {
      setTabChanging(true);
    } else {
      setLoading(true);
    }

    routerQuery(updatedQuery, DEFAULT_QUERY);
  }, [routerQuery, setLoading, searchQuery.tab]);

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

  const getColumnsForTab = (tab: UserTableTab): TableColumn<UserWithStats>[] => {
    const baseColumns = [
      {
        id: 'index',
        name: '#',
        selector: (row: UserWithStats) => row.index,

      },
      {
        id: 'name',
        name: 'Name',
        selector: (row: UserWithStats) => <FormattedUser id='users' size={Dimensions.AvatarSizeSmall} user={row} />,
        sortable: false,
        style: { minWidth: '120px' },
      },
    ];

    switch (tab) {
    case UserTableTab.GENERAL:
      return [
        ...baseColumns,
        {
          id: 'calcLevelsSolvedCount',
          name: 'Solved',
          selector: row => row.calcLevelsSolvedCount ?? 0,
          sortable: true,
        },
        {
          id: 'calcLevelsCompletedCount',
          name: 'Completed',
          selector: row => row.calcLevelsCompletedCount ?? 0,
          sortable: true,
        },
        {
          id: 'calcRankedSolves',
          name: 'Rank Solves',
          selector: row => row.calcRankedSolves ?? 0,
          sortable: true,
        },
        {
          id: 'calcLevelsCreatedCount',
          name: 'Levels Made',
          selector: row => row.calcLevelsCreatedCount ?? 0,
          sortable: true,
        },
        {
          id: 'last_visited_at',
          name: 'Last Seen',
          selector: (row: UserWithStats) => row.last_visited_at ? <FormattedDate style={{ color: 'var(--color)', fontSize: 13 }} ts={row.last_visited_at} /> : '-',
          sortable: true,
          style: { minWidth: 128 },
        },
        {
          id: 'ts',
          name: 'Registered',
          selector: (row: UserWithStats) => row.ts ? <FormattedDate style={{ color: 'var(--color)', fontSize: 13 }} ts={row.ts} /> : 'Not registered',
          sortable: true,
          style: { minWidth: 128 },
        },
      ];
    case UserTableTab.FOLLOWERS:
      return [
        ...baseColumns,
        {
          id: 'followerCount',
          name: 'Followers',
          selector: (row: UserWithStats) => row.followerCount ?? 0,
          sortable: false,
        },
      ];
    case UserTableTab.MULTIPLAYER:
      return [
        ...baseColumns,
        {
          id: 'ratingRushBullet',
          name: 'Bullet',
          selector: (row: any) => (
            <div className='flex flex-col items-center'>
              <MultiplayerRating hideType profile={row as unknown as MultiplayerProfile} type={MultiplayerMatchType.RushBullet} />
            </div>
          ),
          sortable: true,
        },
        {
          id: 'ratingRushBlitz',
          name: 'Blitz',
          selector: (row: any) => (
            <div className='flex flex-col items-center'>
              <MultiplayerRating hideType profile={row as unknown as MultiplayerProfile} type={MultiplayerMatchType.RushBlitz} />
            </div>
          ),
          sortable: true,
        },
        {
          id: 'ratingRushRapid',
          name: 'Rapid',
          selector: row => (
            <div className='flex flex-col items-center'>
              <MultiplayerRating hideType profile={row as unknown as MultiplayerProfile} type={MultiplayerMatchType.RushRapid} />
            </div>
          ),
          sortable: true,
        },
        {
          id: 'ratingRushClassical',
          name: 'Classical',
          selector: (row: any) => (
            <div className='flex flex-col items-center'>
              <MultiplayerRating hideType profile={row as unknown as MultiplayerProfile} type={MultiplayerMatchType.RushClassical} />
            </div>
          ),
          sortable: true,
        },
      ];
    case UserTableTab.STREAKS:
      return [
        ...baseColumns,
        {
          id: 'calcCurrentStreak',
          name: 'Current Streak',
          selector: row => row.calcCurrentStreak ?? 0,
          sortable: true,
        },
      ];
    }
  };

  if (!query) {
    return null;
  }

  return (<>
    <NextSeo
      title={'Users - ' + game.displayName}
      canonical={`${game.baseUrl}/users`}
      openGraph={{
        title: 'Users - ' + game.displayName,
        type: 'article',
        url: '/users',
      }}
    />
    <Page title={'Users'}>
      <div className='flex flex-col items-center m-2 gap-2'>
        <input
          key='search-level-input'
          onChange={e => {
            setQueryHelper({
              search: e.target.value,
            });
          }}
          placeholder='Filter users...'
          type='search'
          value={query.search}
        />
        <details className='text-center text-xs'>
          <summary className='cursor-pointer hover:text-blue-500'>
            Advanced Options
          </summary>
          <div className='flex flex-row gap-2 justify-center mt-2'>
            <input
              checked={query.showNotRegistered === 'true'}
              id='showNotRegistered'
              name='collection'
              onChange={() => {
                fetchLevels({
                  ...query,
                  showNotRegistered: String(query.showNotRegistered !== 'true'),
                });
              }}
              type='checkbox'
            />
            <label htmlFor='showNotRegistered'>
              Include Unregistered<br />(Legacy Users From 2007)
            </label>
          </div>
        </details>
        
        <div className='flex flex-row gap-2 justify-center'>
          {USER_TABLE_TABS.map(tab => (
            <button
              key={tab}
              className={`px-4 py-2 rounded ${
                query.tab === tab
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              onClick={() => {
                fetchLevels({
                  ...query,
                  tab,
                  page: '1', // Reset to first page when changing tabs
                });
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {tabChanging ? (
        <div className='flex justify-center items-center p-8'>
          <Loader className='animate-spin' />
        </div>
      ) : (
        <DataTable
          conditionalRowStyles={[{
            style: {
              backgroundColor: 'var(--bg-color-4)',
            },
            when: row => row._id === user?._id,
          }]}
          columns={getColumnsForTab(query.tab as UserTableTab)}
          data={data}
          itemsPerPage={ITEMS_PER_PAGE}
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
          onSort={async (columnId: string) => {
            const sortAsc = columnId === 'userId' || columnId === 'name';

            const update = {
              sortBy: columnId,
              sortDir: sortAsc ? 'asc' : 'desc',
            } as Partial<UserSearchQuery>;

            if (columnId === query.sortBy) {
              update.sortDir = query.sortDir === 'desc' ? 'asc' : 'desc';
            }

            fetchLevels({
              ...query,
              ...update,
            });
          }}
          page={Number(query.page ?? '1')}
          sortBy={query.sortBy}
          sortDir={query.sortDir}
          totalItems={totalRows}
        />
      )}
    </Page>
  </>);
}
