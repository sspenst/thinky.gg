import FormattedDate from '@root/components/formatted/formattedDate';
import MultiplayerRating from '@root/components/multiplayer/multiplayerRating';
import DataTable, { TableColumn } from '@root/components/tables/dataTable';
import { GameType } from '@root/constants/Games';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import useRouterQuery from '@root/hooks/useRouterQuery';
import cleanUser from '@root/lib/cleanUser';
import debounce from 'debounce';
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
}

export const DEFAULT_QUERY = {
  page: '1',
  search: '',
  showNotRegistered: 'false',
  sortBy: 'config.calcLevelsSolvedCount',
  sortDir: 'desc',
} as UserSearchQuery;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const gameId = getGameIdFromReq(context.req);
  const game = getGameFromId(gameId);

  DEFAULT_QUERY.sortBy = game.type === GameType.COMPLETE_AND_SHORTEST ? 'config.calcLevelsCompletedCount' : 'config.calcLevelsSolvedCount';
  const searchQuery = { ...DEFAULT_QUERY };

  if (context.query && (Object.keys(context.query).length > 0)) {
    for (const q in context.query as UserSearchQuery) {
      searchQuery[q] = context.query[q];
    }
  }

  const { page, search, showNotRegistered, sortBy, sortDir } = searchQuery;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchObj = {} as { [key: string]: any };

  if (search && search.length > 0) {
    searchObj['name'] = {
      $regex: cleanInput(search),
      $options: 'i',
    };
  }

  if (showNotRegistered !== 'true') {
    searchObj['ts'] = { $exists: true };
  }

  const sortObj = [[sortBy, sortDir === 'asc' ? 1 : -1]];

  // if we are sortting by completion then make the second order sort by solves
  if (sortBy === 'config.calcLevelsCompletedCount') {
    // if we are sortting by solves then make the second order sort by completion
    sortObj.push(['config.calcLevelsSolvedCount', -1]);
  } else if (sortBy === 'config.calcLevelsSolvedCount') {
    // if we are sortting by rating then make the second order sort by total games
    sortObj.push(['config.calcLevelsCompletedCount', -1]);
  } else if (sortBy === 'ratingRushBullet' || sortBy === 'ratingRushBlitz' || sortBy === 'ratingRushRapid' || sortBy === 'ratingRushClassical') {
    // sort by total games
    // replace rating with calc
    const countField = sortBy.replace('rating', 'calc');

    sortObj.push([countField + 'Count', -1]);
  }

  // default sort in case of ties
  if (sortBy !== 'name') {
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
      ...getEnrichUserConfigPipelineStage(gameId),
    ];

    // Optional lookups based on sort field
    const optionalLookups = [];

    // Only add multiplayer lookups if sorting by rating
    if (sortBy.startsWith('ratingRush')) {
      const ratingType = sortBy.replace('rating', 'calc');

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
        {
          $match: {
            [`multiplayerProfile.${ratingType}Count`]: { $gte: 5 }
          }
        }
      );
    }

    // Only add follower lookup if sorting by followers
    if (sortBy === 'followerCount') {
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

    // Only add review lookups if sorting by review fields
    if (sortBy === 'reviewAverage' || sortBy === 'reviewCount') {
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
          sortReviewCount: { $ifNull: ['$reviews.count', 0] }
        }
      },
      // Modify sort object to use computed fields
      {
        $sort: {
          ...sortObj.reduce((acc, cur) => {
            const field = cur[0];
            const direction = cur[1];

            // Map original sort fields to computed sort fields
            const sortFieldMap: { [key: string]: string } = {
              'reviewAverage': 'sortReviewAverage',
              'last_visited_at': 'sortLastSeen',
              'followerCount': 'sortFollowerCount',
              'ratingRushBullet': 'sortRatingRushBullet',
              'ratingRushBlitz': 'sortRatingRushBlitz',
              'ratingRushRapid': 'sortRatingRushRapid',
              'ratingRushClassical': 'sortRatingRushClassical',
              'reviewCount': 'sortReviewCount'
            };

            return {
              ...acc,
              [sortFieldMap[field] || field]: direction
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

    // Add any lookups that weren't already added but are needed for display
    if (!sortBy.startsWith('ratingRush')) {
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

    if (sortBy !== 'followerCount') {
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

    if (sortBy !== 'reviewAverage' && sortBy !== 'reviewCount') {
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
          roles: 1,
          reviewAverage: {
            $cond: {
              if: { $ne: [ '$reviews.scoreCount', 0 ] },
              then: { $divide: [ '$reviews.scoreTotal', '$reviews.scoreCount' ] },
              else: null
            }
          },
          reviewCount: '$reviews.count',
          ts: 1,
          config: 1,
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
  searchQuery: UserSearchQuery;
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

  DEFAULT_QUERY.sortBy = game.type === GameType.COMPLETE_AND_SHORTEST ? 'config.calcLevelsCompletedCount' : 'config.calcLevelsSolvedCount';

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
    routerQuery(query, DEFAULT_QUERY);
  }, [routerQuery, setLoading]);

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

  const columns: TableColumn<UserWithStats>[] = [
    {
      id: 'index',
      name: '#',
      selector: row => row.index,
      style: {
        minWidth: 60,
      },
    },
    {
      id: 'name',
      name: 'Name',
      selector: row => <FormattedUser id='users' size={Dimensions.AvatarSizeSmall} user={row} />,
      sortable: true,
      style: {
        minWidth: 200,
      },
    },
    {
      id: 'config.calcLevelsSolvedCount',
      name: 'Solved',
      selector: row => row.config?.calcLevelsSolvedCount ?? 0,
      sortable: true,
    },
    {
      id: 'config.calcLevelsCompletedCount',
      name: 'Completed',
      selector: row => row.config?.calcLevelsCompletedCount ?? 0,
      sortable: true,
    },
    {
      id: 'config.calcRankedSolves',
      name: 'Rank Solves',
      selector: row => row.config?.calcRankedSolves ?? 0,
      sortable: true,
    },
    {
      id: 'config.calcLevelsCreatedCount',
      name: 'Levels Made',
      selector: row => row.config?.calcLevelsCreatedCount ?? 0,
      sortable: true,
    },
    {
      id: 'config.calcRecordsCount',
      name: 'Records',
      selector: row => row.config?.calcRecordsCount ?? 0,
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
      selector: row => row.last_visited_at ? <FormattedDate style={{ color: 'var(--color)', fontSize: 13 }} ts={row.last_visited_at} /> : '-',
      sortable: true,
      style: {
        minWidth: 128,
      },
    },
    {
      id: 'ts',
      name: 'Registered',
      selector: row => row.ts ? <FormattedDate style={{ color: 'var(--color)', fontSize: 13 }} ts={row.ts} /> : 'Not registered',
      sortable: true,
      style: {
        minWidth: 128,
      },
    },
    {
      id: 'reviewAverage',
      name: 'Avg Review',
      selector: row => row.reviewAverage ? Math.round(row.reviewAverage * 100) / 100 : '-',
      sortable: false,
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
      selector: row => <MultiplayerRating hideType profile={row as unknown as MultiplayerProfile} type={MultiplayerMatchType.RushBullet} />,
      sortable: true,
    },
    {
      id: 'ratingRushBlitz',
      name: 'Blitz',
      selector: row => <MultiplayerRating hideType profile={row as unknown as MultiplayerProfile} type={MultiplayerMatchType.RushBlitz} />,
      sortable: true,
    },
    {
      id: 'ratingRushRapid',
      name: 'Rapid',
      selector: row => <MultiplayerRating hideType profile={row as unknown as MultiplayerProfile} type={MultiplayerMatchType.RushRapid} />,
      sortable: true,
    },
    {
      id: 'ratingRushClassical',
      name: 'Classical',
      selector: row => <MultiplayerRating hideType profile={row as unknown as MultiplayerProfile} type={MultiplayerMatchType.RushClassical} />,
      sortable: true,
    },
  ];

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
          } }
          placeholder='Filter users...'
          type='search'
          value={query.search}
        />
        <div className='flex flex-row gap-2 justify-center text-sm'>
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
              Show not registered
          </label>
        </div>
      </div>
      <DataTable
        conditionalRowStyles={[{
          style: {
            backgroundColor: 'var(--bg-color-4)',
          },
          when: row => row._id === user?._id,
        }]}
        columns={columns}
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
            // default to most useful sort direction
            sortDir: sortAsc ? 'asc' : 'desc',
          } as Partial<UserSearchQuery>;

          if (columnId === query.sortBy) {
            // swap sortDir if the same col is clicked
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
    </Page>
  </>);
}
