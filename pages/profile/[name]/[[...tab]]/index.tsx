import FormattedDate from '@root/components/formatted/formattedDate';
import LoadingSpinner from '@root/components/page/loadingSpinner';
import RoleIcons from '@root/components/page/roleIcons';
import StyledTooltip from '@root/components/page/styledTooltip';
import LevelsSolvedByDifficultyList from '@root/components/profile/levelsSolvedByDifficultyList';
import PlayerRank from '@root/components/profile/playerRank';
import { ProfileAchievments } from '@root/components/profile/profileAchievements';
import ProfileMultiplayer from '@root/components/profile/profileMultiplayer';
import StatFilter from '@root/constants/statFilter';
import { getUsersWithMultiplayerProfile } from '@root/helpers/getUsersWithMultiplayerProfile';
import useSWRHelper from '@root/hooks/useSWRHelper';
import Graph from '@root/models/db/graph';
import { MultiplayerMatchState } from '@root/models/MultiplayerEnums';
import { getCollections } from '@root/pages/api/collection-by-id/[id]';
import classNames from 'classnames';
import { debounce } from 'debounce';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useEffect, useState } from 'react';
import FollowButton from '../../../../components/buttons/followButton';
import Select from '../../../../components/cards/select';
import SelectFilter from '../../../../components/cards/selectFilter';
import CommentWall from '../../../../components/level/reviews/commentWall';
import FormattedReview from '../../../../components/level/reviews/formattedReview';
import AddCollectionModal from '../../../../components/modal/addCollectionModal';
import MultiSelectUser from '../../../../components/page/multiSelectUser';
import Page from '../../../../components/page/page';
import FollowingList from '../../../../components/profile/followingList';
import ProfileAvatar from '../../../../components/profile/profileAvatar';
import ProfileInsights from '../../../../components/profile/profileInsights';
import Dimensions from '../../../../constants/dimensions';
import GraphType from '../../../../constants/graphType';
import TimeRange from '../../../../constants/timeRange';
import statFilterOptions from '../../../../helpers/filterSelectOptions';
import getProfileSlug from '../../../../helpers/getProfileSlug';
import { getReviewsByUserId, getReviewsByUserIdCount } from '../../../../helpers/getReviewsByUserId';
import { getReviewsForUserId, getReviewsForUserIdCount } from '../../../../helpers/getReviewsForUserId';
import naturalSort from '../../../../helpers/naturalSort';
import cleanUser from '../../../../lib/cleanUser';
import { getUserFromToken } from '../../../../lib/withAuth';
import Achievement from '../../../../models/db/achievement';
import { EnrichedCollection } from '../../../../models/db/collection';
import { EnrichedLevel } from '../../../../models/db/level';
import Review from '../../../../models/db/review';
import User from '../../../../models/db/user';
import { AchievementModel, CollectionModel, GraphModel, LevelModel, MultiplayerMatchModel } from '../../../../models/mongoose';
import { LEVEL_DEFAULT_PROJECTION } from '../../../../models/schemas/levelSchema';
import SelectOption from '../../../../models/selectOption';
import SelectOptionStats from '../../../../models/selectOptionStats';
import { getFollowData } from '../../../api/follow';
import { doQuery } from '../../../api/search';
import { SearchQuery } from '../../../search';

export const enum ProfileTab {
  Achievements = 'achievements',
  Collections = 'collections',
  Insights = 'insights',
  Profile = '',
  Levels = 'levels',
  Multiplayer = 'multiplayer',
  ReviewsWritten = 'reviews-written',
  ReviewsReceived = 'reviews-received',
}

export interface ProfileParams extends ParsedUrlQuery {
  name: string;
  tab: string[];
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  if (!context.params) {
    return { notFound: true };
  }

  const { name, tab } = context.params as ProfileParams;
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const page = context.query?.page ? parseInt(context.query.page as string) : 1;

  if (tab && tab.length > 1) {
    return {
      notFound: true,
    };
  }

  const profileTab = !tab ? ProfileTab.Profile : tab[0] as ProfileTab;
  const users = await getUsersWithMultiplayerProfile({ name: name }, { bio: 1, ts: 1, calc_levels_created_count: 1, calc_records: 1, score: 1 });

  if (!users || users.length !== 1) {
    return {
      notFound: true
    };
  }

  const user = users[0];

  cleanUser(user);

  const userId = user._id.toString();

  const viewingOwnProfile = reqUser && reqUser._id.toString() === userId;
  const [
    achievements,
    achievementsCount,
    collectionsCount,
    followData,
    levelsCount,
    multiplayerCount,
    reviewsReceived,
    reviewsWritten,
    reviewsReceivedCount,
    reviewsWrittenCount,
  ] = await Promise.all([
    profileTab === ProfileTab.Achievements ? AchievementModel.find<Achievement>({ userId: userId }) : [] as Achievement[],
    AchievementModel.countDocuments({ userId: userId }),
    CollectionModel.countDocuments(
      { 
       userId: userId, 
       ...(!viewingOwnProfile && {private: {$ne: true}})
      }
        ),
    getFollowData(user._id.toString(), reqUser),
    LevelModel.countDocuments({ isDeleted: { $ne: true }, isDraft: false, userId: userId }),
    MultiplayerMatchModel.countDocuments({ players: userId, state: MultiplayerMatchState.FINISHED, rated: true }),
    profileTab === ProfileTab.ReviewsReceived ? getReviewsForUserId(userId, reqUser, { limit: 10, skip: 10 * (page - 1) }) : [] as Review[],
    profileTab === ProfileTab.ReviewsWritten ? getReviewsByUserId(userId, reqUser, { limit: 10, skip: 10 * (page - 1) }) : [] as Review[],
    getReviewsForUserIdCount(userId),
    getReviewsByUserIdCount(userId),
  ]);

  const profilePageProps = {
    achievements: JSON.parse(JSON.stringify(achievements)),
    achievementsCount: achievementsCount,
    collectionsCount: collectionsCount,
    followerCountInit: followData.followerCount,
    levelsCount: levelsCount,
    multiplayerCount: multiplayerCount,
    pageProp: page,
    profileTab: profileTab,
    reqUser: reqUser ? JSON.parse(JSON.stringify(reqUser)) : null,
    reqUserIsFollowing: followData.isFollowing || null,
    reviewsReceived: JSON.parse(JSON.stringify(reviewsReceived)),
    reviewsReceivedCount: reviewsReceivedCount,
    reviewsWritten: JSON.parse(JSON.stringify(reviewsWritten)),
    reviewsWrittenCount: reviewsWrittenCount,
    user: JSON.parse(JSON.stringify(user)),
  } as ProfilePageProps;

  if (profileTab === ProfileTab.Profile) {
    if (reqUser && reqUser._id.toString() === userId) {
      // make a aggregation version of the same query above
      const followingAgg = await GraphModel.aggregate([
        { $match: { source: reqUser._id, type: GraphType.FOLLOW } },
        {
          $lookup: {
            from: 'users',
            localField: 'target',
            foreignField: '_id',
            as: 'target',
            pipeline: [
              { $project: { name: 1, avatarUpdatedAt: 1, last_visited_at: 1, hideStatus: 1 } },
            ],
          },
        },
        { $unwind: '$target' },
        { $sort: { createdAt: -1 } },
      ]).exec() as Graph[];
      const reqUserFollowing = followingAgg.map((f) => {
        cleanUser(f.target as User);

        return f;
      }).sort((a, b) => a.createdAt < b.createdAt ? 1 : -1);

      profilePageProps.reqUserFollowing = JSON.parse(JSON.stringify(reqUserFollowing));
    }
  }

  if (profileTab === ProfileTab.Collections) {
    const collectionsAgg = await getCollections({
      matchQuery: { $match: { 
        userId: user._id ,
        ...(!viewingOwnProfile && {private: {$ne: true}})
      } },
      reqUser,
    });

    profilePageProps.enrichedCollections = JSON.parse(JSON.stringify(collectionsAgg));
  }

  if (profileTab === ProfileTab.Levels) {
    const searchQuery: SearchQuery = {
      sortBy: 'name',
      sortDir: 'asc',
      timeRange: TimeRange[TimeRange.All]
    };

    if (context.query && (Object.keys(context.query).length > 0)) {
      for (const q in context.query as SearchQuery) {
        searchQuery[q] = context.query[q];
      }
    }

    searchQuery.searchAuthorId = user._id.toString();

    const query = await doQuery(searchQuery, reqUser, {
      ...LEVEL_DEFAULT_PROJECTION,
      data: 1,
      width: 1,
      height: 1,
    });

    if (!query) {
      throw new Error('Error finding Levels');
    }

    profilePageProps.enrichedLevels = JSON.parse(JSON.stringify(query.levels));
    profilePageProps.searchQuery = searchQuery;
    profilePageProps.totalRows = query.totalRows;
  }

  return {
    props: profilePageProps,
  };
}

export interface ProfilePageProps {
  achievements: Achievement[];
  achievementsCount: number;
  collectionsCount: number;
  enrichedCollections: EnrichedCollection[] | undefined;
  enrichedLevels: EnrichedLevel[] | undefined;
  followerCountInit: number;
  levelsCount: number;
  multiplayerCount: number;
  pageProp: number;
  profileTab: ProfileTab;
  reqUser: User | null;
  reqUserFollowing: Graph[] | undefined;
  reqUserIsFollowing?: boolean;
  reviewsReceived?: Review[];
  reviewsReceivedCount: number;
  reviewsWritten?: Review[];
  reviewsWrittenCount: number;
  searchQuery: SearchQuery | undefined;
  totalRows: number | undefined;
  user: User;
}

/* istanbul ignore next */
export default function ProfilePage({
  achievements,
  achievementsCount,
  collectionsCount,
  enrichedCollections,
  enrichedLevels,
  followerCountInit,
  levelsCount,
  multiplayerCount,
  pageProp,
  profileTab,
  reqUser,
  reqUserFollowing,
  reqUserIsFollowing,
  reviewsReceived,
  reviewsReceivedCount,
  reviewsWritten,
  reviewsWrittenCount,
  searchQuery,
  totalRows,
  user,
}: ProfilePageProps) {
  const [collectionFilterText, setCollectionFilterText] = useState('');
  const [followerCount, setFollowerCount] = useState<number>();
  const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false);
  const [page, setPage] = useState(pageProp);
  const router = useRouter();
  const [searchLevelText, setSearchLevelText] = useState('');
  const [showCollectionFilter, setShowCollectionFilter] = useState(StatFilter.All);
  const [showLevelFilter, setShowLevelFilter] = useState(StatFilter.All);
  const [tab, setTab] = useState(profileTab);

  useEffect(() => {
    setFollowerCount(followerCountInit);
  }, [followerCountInit]);

  useEffect(() => {
    setPage(pageProp);
  }, [pageProp]);

  useEffect(() => {
    setTab(profileTab);
  }, [profileTab]);

  useEffect(() => {
    setSearchLevelText(searchQuery?.search || '');
    setShowLevelFilter(searchQuery?.statFilter || StatFilter.All);
  }, [searchQuery]);

  const getCollectionOptions = useCallback(() => {
    if (!enrichedCollections) {
      return [];
    }

    // sort collections by name but use a natural sort
    const sortedEnrichedCollections = naturalSort(enrichedCollections) as EnrichedCollection[];

    return sortedEnrichedCollections.map(enrichedCollection => {
      return {
        href: `/collection/${enrichedCollection.slug}`,
        id: enrichedCollection._id.toString(),
        stats: new SelectOptionStats(enrichedCollection.levelCount, enrichedCollection.userSolvedCount),
        text: <div className='flex flex-col'><span>{enrichedCollection.name}</span>{enrichedCollection.private ? <span className='text-xs italic'>private</span> : null}</div>,
      } as SelectOption;
    });
  }, [enrichedCollections]);

  const getFilteredCollectionOptions = useCallback(() => {
    return statFilterOptions(getCollectionOptions(), showCollectionFilter, collectionFilterText);
  }, [collectionFilterText, getCollectionOptions, showCollectionFilter]);

  const collectionsAsOptions = getFilteredCollectionOptions();
  const getLevelOptions = useCallback(() => {
    if (!user || !enrichedLevels) {
      return [];
    }

    return enrichedLevels.map(level => {
      return {
        height: Dimensions.OptionHeightMedium,
        href: `/level/${level.slug}`,
        id: level._id.toString(),
        level: level,
        stats: new SelectOptionStats(level.leastMoves, level.userMoves),
        text: level.name,
      } as SelectOption;
    });
  }, [enrichedLevels, user]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setSearchLevelTextDebounce = useCallback(
    debounce((name: string) => {
      router.push({
        pathname: `/profile/${user.name}/${tab}`,
        query: {
          page: 1,
          search: name,
          statFilter: showLevelFilter,
        },
      });
    }, 500), [showLevelFilter, tab]);

  const onFilterCollectionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as StatFilter;

    setShowCollectionFilter(showCollectionFilter === value ? StatFilter.All : value);
    setPage(1);
  };

  const onFilterLevelClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as StatFilter;

    router.push({
      pathname: `/profile/${user.name}/${tab}`,
      query: {
        page: 1,
        search: searchLevelText,
        statFilter: showLevelFilter === value ? StatFilter.All : value,
      },
    });
  };

  const { data: profileDataFetched } = useSWRHelper<{levelsSolvedByDifficulty: {[key: string]: number}}>('/api/user/' + user._id + '?type=levelsSolvedByDifficulty', {}, {}, tab !== ProfileTab.Profile);

  const levelsSolvedByDifficulty = profileDataFetched?.levelsSolvedByDifficulty;

  // create an array of objects with the id, trigger element (eg. button), and the content element
  const tabsContent = {
    [ProfileTab.Profile]: (user.ts ?
      <>
        <div className='flex items-center justify-center mb-4'>
          <ProfileAvatar size={Dimensions.AvatarSizeLarge} user={user} />
        </div>
        <div className='flex gap-2 items-center justify-center'>
          <h2 className='text-3xl font-bold truncate'>{user.name}</h2>
          <RoleIcons id='profile' size={24} user={user} />
        </div>
        {user.bio && <p className='text-center italic text-sm break-words mt-2'>{user.bio}</p>}
        {reqUser && reqUserIsFollowing !== undefined && reqUser._id.toString() !== user._id.toString() && (
          <div className='m-4 text-center'>
            <FollowButton
              isFollowing={reqUserIsFollowing}
              onResponse={followData => setFollowerCount(followData.followerCount)}
              user={user}
            />
          </div>
        )}
        <div className='flex flex-row flex-wrap justify-center text-left gap-10 m-4'>
          <div>
            <h2 className='flex gap-2'>
              <span
                className='font-bold'
                data-tooltip-content='Highest unlocked Skill achievement'
                data-tooltip-id='rank-tooltip'
              >
                Rank:
              </span>
              <StyledTooltip id='rank-tooltip' />
              {
                levelsSolvedByDifficulty ? <PlayerRank levelsSolvedByDifficulty={levelsSolvedByDifficulty} user={user} /> : '...'
              }
            </h2>
            <h2><span className='font-bold'>Levels Solved:</span> {user.score}</h2>
            <h2><span className='font-bold'>Levels Created:</span> {user.calc_levels_created_count}</h2>
            {!user.hideStatus && <>
              <h2><span className='font-bold'>Last Seen:</span> <FormattedDate style={{ color: 'var(--color)', fontSize: '1rem' }} ts={user.last_visited_at ? user.last_visited_at : user.ts} /></h2>
            </>}
            <h2><span className='font-bold'>Registered:</span> <FormattedDate style={{ color: 'var(--color)', fontSize: '1rem' }} ts={user.ts} /></h2>
            <h2><span className='font-bold'>Followers:</span> {followerCount}</h2>
            <div className='mt-4'>
              <h2><span className='font-bold'>Levels Solved by Difficulty:</span></h2>
              {levelsSolvedByDifficulty ?
                <LevelsSolvedByDifficultyList data={levelsSolvedByDifficulty} />
                :
                <div className='p-2'><LoadingSpinner /></div>
              }
            </div>
            {reqUser && reqUser._id.toString() === user._id.toString() && reqUserFollowing && (<>
              <div className='font-bold text-xl mt-4 mb-2 justify-center flex'>{`${reqUserFollowing.length} following:`}</div>
              <FollowingList graphs={reqUserFollowing} />
            </>)}
          </div>
          <CommentWall userId={user._id} />
        </div>
      </>
      :
      <div className='text-center break-words'>
        {user.name} has not yet registered on Pathology.
      </div>
    ),
    [ProfileTab.Insights]: <ProfileInsights reqUser={reqUser} user={user} />,
    [ProfileTab.Multiplayer]: <ProfileMultiplayer user={user} />,
    [ProfileTab.Collections]: (
      <div className='flex flex-col gap-2 justify-center'>
        {collectionsAsOptions.length > 0 &&
          <SelectFilter
            filter={showCollectionFilter}
            onFilterClick={onFilterCollectionClick}
            placeholder={`Search ${collectionsAsOptions.length} collection${collectionsAsOptions.length !== 1 ? 's' : ''}...`}
            searchText={collectionFilterText}
            setSearchText={setCollectionFilterText}
          />
        }
        {reqUser?._id === user._id &&
          <div className='text-center'>
            <button
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer'
              onClick={() => {
                setIsAddCollectionOpen(true);
              }}
            >
              New Collection
            </button>
          </div>
        }
        <AddCollectionModal
          closeModal={() => {
            setIsAddCollectionOpen(false);
          }}
          isOpen={isAddCollectionOpen}
        />
        {collectionsAsOptions.length === 0 ?
          <div className='p-3 justify-center flex'>
            No collections!
          </div>
          :
          <Select options={collectionsAsOptions} />
        }
      </div>
    ),
    [ProfileTab.Levels]: (
      <div className='flex flex-col gap-2 items-center'>
        <SelectFilter
          filter={showLevelFilter}
          onFilterClick={onFilterLevelClick}
          placeholder={`Search ${totalRows} level${totalRows !== 1 ? 's' : ''}...`}
          searchText={searchLevelText}
          setSearchText={searchText => {
            setSearchLevelText(searchText);
            setSearchLevelTextDebounce(searchText);
          }}
        />
        {reqUser?._id === user._id &&
          <Link
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer block w-fit'
            href='/new'
          >
            New Level
          </Link>
        }
        <Link
          className='underline'
          href={'/search?timeRange=All&searchAuthor=' + user.name}
        >
          Advanced search
        </Link>
        <Select options={getLevelOptions()} />
        {totalRows !== undefined && totalRows > 20 &&
          <div className='flex justify-center flex-row'>
            {page > 1 && (
              <Link
                className='ml-2 underline'
                href={`/profile/${user.name}/${ProfileTab.Levels}?page=${page - 1}&search=${searchLevelText}&statFilter=${showLevelFilter}`}
              >
                Previous
              </Link>
            )}
            <div id='page-number' className='ml-2'>{page} of {Math.ceil(totalRows / 20)}</div>
            {totalRows > (page * 20) && (
              <Link
                className='ml-2 underline'
                href={`/profile/${user.name}/${ProfileTab.Levels}?page=${page + 1}&search=${searchLevelText}&statFilter=${showLevelFilter}`}
              >
                Next
              </Link>
            )}
          </div>
        }
      </div>
    ),
    [ProfileTab.ReviewsWritten]: [
      reviewsWritten?.map(review => {
        return (
          <div
            key={`review-${review._id}`}
            style={{
              margin: 20,
            }}
          >
            <FormattedReview
              level={review.levelId}
              review={review}
              user={user}
            />
          </div>
        );
      }),
      reviewsWrittenCount > 10 &&
        <div key='pagination_btns' className='flex justify-center flex-row'>
          {page > 1 && (
            <Link
              className='ml-2 underline'
              href={`/profile/${user.name}/${ProfileTab.ReviewsWritten}${page !== 2 ? `?page=${page - 1}` : ''}`}
            >
              Previous
            </Link>
          )}
          <div id='page-number' className='ml-2'>{page} of {Math.ceil(reviewsWrittenCount / 10)}</div>
          {reviewsWrittenCount > (page * 10) && (
            <Link
              className='ml-2 underline'
              href={`/profile/${user.name}/${ProfileTab.ReviewsWritten}?page=${page + 1}`}
            >
              Next
            </Link>
          )}
        </div>
      ,
      reviewsWrittenCount === 0 &&
        <div className='text-center'>
          No reviews written!
        </div>
      ,
    ],
    [ProfileTab.ReviewsReceived]: [
      reviewsReceived?.map(review => {
        return (
          <div
            key={`review-${review._id}`}
            style={{
              margin: 20,
            }}
          >
            <FormattedReview
              level={review.levelId}
              review={review}
              user={review.userId}
            />
          </div>
        );
      }),
      reviewsReceivedCount > 10 &&
        <div key='pagination_btns' className='flex justify-center flex-row'>
          {page > 1 && (
            <Link
              className='ml-2 underline'
              href={`/profile/${user.name}/${ProfileTab.ReviewsReceived}${page !== 2 ? `?page=${page - 1}` : ''}`}
            >
              Previous
            </Link>
          )}
          <div id='page-number' className='ml-2'>{page} of {Math.ceil(reviewsReceivedCount / 10)}</div>
          {reviewsReceivedCount > (page * 10) && (
            <Link
              className='ml-2 underline'
              href={`/profile/${user.name}/${ProfileTab.ReviewsReceived}?page=${page + 1}`}
            >
              Next
            </Link>
          )}
        </div>
      ,
      reviewsReceivedCount === 0 &&
        <div>
          No reviews received!
        </div>
      ,
    ],
    [ProfileTab.Achievements]: (
      <ProfileAchievments achievements={achievements} />
    ),
  } as { [key: string]: React.ReactNode | null };

  const getTabClassNames = useCallback((tabId: ProfileTab) => {
    return classNames(
      'inline-block p-2 rounded-lg',
      tab == tabId ? 'tab-active font-bold' : 'tab',
    );
  }, [tab]);

  return (
    <Page title={user.name}>
      <>
        <NextSeo
          title={`${user.name} - Pathology`}
          description={`${user.name}'s profile`}
          canonical={'https://pathology.gg' + getProfileSlug(user) + '/' + profileTab}
          openGraph={{
            title: `${user.name} - Pathology`,
            description: `${user.name}'s profile`,
            type: 'profile',
            url: getProfileSlug(user),
            images: [
              {
                url: user.avatarUpdatedAt ? `/api/avatar/${user._id}.png` : '/avatar_default.png',
                width: Dimensions.Avatar / 4,
                height: Dimensions.Avatar / 4,
                alt: user.name,
                type: 'image/png',
              },
            ],
          }}
        />
        <div className='flex flex-wrap text-sm text-center gap-2 mt-2 justify-center items-center'>
          <Link
            className={getTabClassNames(ProfileTab.Profile)}
            href={`/profile/${user.name}`}
          >
            <div className='flex flex-row items-center gap-2'>
              <ProfileAvatar size={24} user={user} />
              <span>Profile</span>
            </div>
          </Link>
          <Link
            className={getTabClassNames(ProfileTab.Insights)}
            href={`/profile/${user.name}/${ProfileTab.Insights}`}
          >
            <div className='flex flex-row items-center gap-2'>
              <Image alt='pro' src='/pro.svg' width='16' height='16' />
              <span>Insights</span>
            </div>
          </Link>
          <Link
            className={getTabClassNames(ProfileTab.Achievements)}
            href={`/profile/${user.name}/${ProfileTab.Achievements}`}
          >
            <div className='flex flex-row items-center gap-2'>
              <span>🏆</span>
              <span>Achievements ({achievementsCount})</span>
            </div>
          </Link>
          <Link
            className={getTabClassNames(ProfileTab.Levels)}
            href={`/profile/${user.name}/${ProfileTab.Levels}`}
          >
            <div className='flex flex-row items-center gap-2'>
              <span>🏗</span>
              <span>Levels ({levelsCount})</span>
            </div>
          </Link>
          <Link
            className={getTabClassNames(ProfileTab.Collections)}
            href={`/profile/${user.name}/${ProfileTab.Collections}`}
          >
            <div className='flex flex-row items-center gap-2'>
              <span>📚</span>
              <span>Collections ({collectionsCount})</span>
            </div>
          </Link>
          <Link
            className={getTabClassNames(ProfileTab.Multiplayer)}
            href={`/profile/${user.name}/${ProfileTab.Multiplayer}`}
          >
            <div className='flex flex-row items-center gap-2'>
              <span>🎮</span>
              <span>Multiplayer ({multiplayerCount})</span>
            </div>
          </Link>
          <Link
            className={getTabClassNames(ProfileTab.ReviewsWritten)}
            href={`/profile/${user.name}/${ProfileTab.ReviewsWritten}`}
          >
            <div className='flex flex-row items-center gap-2'>
              <span>✍</span>
              <span>Reviews Written ({reviewsWrittenCount})</span>
            </div>
          </Link>
          <Link
            className={getTabClassNames(ProfileTab.ReviewsReceived)}
            href={`/profile/${user.name}/${ProfileTab.ReviewsReceived}`}
          >
            <div className='flex flex-row items-center gap-2'>
              <span>📝</span>
              <span>Reviews Received ({reviewsReceivedCount})</span>
            </div>
          </Link>
          <MultiSelectUser
            onSelect={(user) => {
              if (user?.name) {
                router.push(`/profile/${user.name}/${profileTab}`);
              }
            }}
            placeholder='Switch to another profile'
          />
        </div>
        <div className='tab-content'>
          <div className='p-4' id='content' role='tabpanel' aria-labelledby='tabs-home-tabFill'>
            {tabsContent[tab]}
          </div>
        </div>
      </>
    </Page>
  );
}
