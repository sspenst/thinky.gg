import LevelCard from '@root/components/cards/levelCard';
import { getStreakRankIndex, STREAK_RANK_GROUPS } from '@root/components/counters/AnimateCounterOne';
import FormattedDate from '@root/components/formatted/formattedDate';
import GameLogoAndLabel from '@root/components/gameLogoAndLabel';
import Solved from '@root/components/level/info/solved';
import FollowerModal from '@root/components/modal/followerModal';
import FollowingModal from '@root/components/modal/followingModal';
import LoadingSpinner from '@root/components/page/loadingSpinner';
import RoleIcons from '@root/components/page/roleIcons';
import SpaceBackground from '@root/components/page/SpaceBackground';
import StyledTooltip from '@root/components/page/styledTooltip';
import LevelsSolvedByDifficultyList from '@root/components/profile/levelsSolvedByDifficultyList';
import PlayerRank from '@root/components/profile/playerRank';
import { ProfileAchievments } from '@root/components/profile/profileAchievements';
import ProfileMultiplayer from '@root/components/profile/profileMultiplayer';
import AchievementType from '@root/constants/achievements/achievementType';
import { GameId } from '@root/constants/GameId';
import { Games, GameType } from '@root/constants/Games';
import StatFilter from '@root/constants/statFilter';
import { AppContext } from '@root/contexts/appContext';
import { countUsersWhoCompletedOneLevel } from '@root/helpers/countUsersWhoCompletedOneLevel';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { getUsersWithMultiplayerProfile } from '@root/helpers/getUsersWithMultiplayerProfile';
import isOnline from '@root/helpers/isOnline';
import useSWRHelper from '@root/hooks/useSWRHelper';
import { MultiplayerMatchState } from '@root/models/constants/multiplayer';
import { LEVEL_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import Graph from '@root/models/db/graph';
import { getCollections } from '@root/pages/api/collection-by-id/[id]';
import classNames from 'classnames';
import debounce from 'debounce';
import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { NextSeo, ProfilePageJsonLd } from 'next-seo';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import FollowButton from '../../../../../components/buttons/followButton';
import Select from '../../../../../components/cards/select';
import SelectFilter from '../../../../../components/cards/selectFilter';
import CommentWall from '../../../../../components/level/reviews/commentWall';
import FormattedReview from '../../../../../components/level/reviews/formattedReview';
import AddCollectionModal from '../../../../../components/modal/addCollectionModal';
import Page from '../../../../../components/page/page';
import ProfileAvatar from '../../../../../components/profile/profileAvatar';
import ProfileInsights from '../../../../../components/profile/profileInsights';
import Dimensions from '../../../../../constants/dimensions';
import GraphType from '../../../../../constants/graphType';
import TimeRange from '../../../../../constants/timeRange';
import getProfileSlug from '../../../../../helpers/getProfileSlug';
import { getReviewsByUserId, getReviewsByUserIdCount } from '../../../../../helpers/getReviewsByUserId';
import { getReviewsForUserId, getReviewsForUserIdCount } from '../../../../../helpers/getReviewsForUserId';
import naturalSort, { playLaterCompareFn } from '../../../../../helpers/naturalSort';
import cleanUser from '../../../../../lib/cleanUser';
import { getUserFromToken } from '../../../../../lib/withAuth';
import Achievement from '../../../../../models/db/achievement';
import { EnrichedCollection } from '../../../../../models/db/collection';
import { EnrichedLevel } from '../../../../../models/db/level';
import Review from '../../../../../models/db/review';
import User from '../../../../../models/db/user';
import { AchievementModel, CollectionModel, GraphModel, LevelModel, MultiplayerMatchModel, StatModel, UserModel } from '../../../../../models/mongoose';
import SelectOption from '../../../../../models/selectOption';
import SelectOptionStats from '../../../../../models/selectOptionStats';
import { getFollowData } from '../../../../api/follow';
import { doQuery } from '../../../../api/search';
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

export interface IsFollowingGraph extends Graph {
  isFollowing: boolean;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  if (!context.params) {
    return { notFound: true };
  }

  const gameIdFromReq = getGameIdFromReq(context.req);
  const gameId = gameIdFromReq !== GameId.THINKY ? gameIdFromReq : undefined;
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

  const users = await getUsersWithMultiplayerProfile(gameIdFromReq, { name: name }, { bio: 1, ts: 1, config: 1, lastGame: 1 });

  if (!users || users.length !== 1) {
    return {
      notFound: true
    };
  }

  const user = users[0];

  cleanUser(user);

  const userId = user._id.toString();
  const viewingOwnProfile = reqUser?._id.toString() === userId;
  const [
    achievements,
    achievementsCount,
    collectionsCount,
    levelsCount,
    levelsSolvedAgg,
    multiplayerCount,
    reviewsReceived,
    reviewsWritten,
    reviewsReceivedCount,
    reviewsWrittenCount,
    blockData,
    totalActiveUsers,
    achievementStats,
  ] = await Promise.all([
    profileTab === ProfileTab.Achievements ? AchievementModel.find<Achievement>({ userId: userId }) : [] as Achievement[],
    AchievementModel.countDocuments({ userId: userId, ...(gameId !== undefined ? { gameId: gameId } : {}) }),
    CollectionModel.countDocuments({
      ...(gameId !== undefined ? { gameId: gameId } : {}),
      userId: userId,
      ...(!viewingOwnProfile && { isPrivate: { $ne: true } }),
    }),
    LevelModel.countDocuments({
      isDeleted: { $ne: true },
      isDraft: false,
      userId: userId,
      ...(gameId !== undefined ? { gameId: gameId } : {})
    }),
    profileTab === ProfileTab.Levels && reqUser ? LevelModel.aggregate([
      { $match: {
        ...(gameId !== undefined ? { gameId: gameId } : {}),
        isDeleted: { $ne: true },
        isDraft: false,
        userId: new Types.ObjectId(userId),
      } },
      {
        $lookup: {
          from: StatModel.collection.name,
          localField: '_id',
          foreignField: 'levelId',
          as: 'stats',
          pipeline: [
            { $match: { userId: reqUser._id, complete: true } },
          ],
        },
      },
      { $match: { 'stats.0': { $exists: true } } },
      { $count: 'count' },
    ]) : undefined,
    MultiplayerMatchModel.countDocuments({ players: userId, state: MultiplayerMatchState.FINISHED, rated: true, ...(gameId !== undefined ? { gameId: gameId } : {}) }),
    profileTab === ProfileTab.ReviewsReceived ? getReviewsForUserId(gameId, userId, reqUser, { limit: 10, skip: 10 * (page - 1) }) : [] as Review[],
    profileTab === ProfileTab.ReviewsWritten ? getReviewsByUserId(gameId, userId, reqUser, { limit: 10, skip: 10 * (page - 1) }) : [] as Review[],
    getReviewsForUserIdCount(gameId, userId),
    getReviewsByUserIdCount(gameId, userId),
    // Check if the current user has blocked this profile user
    reqUser ? GraphModel.countDocuments({
      source: reqUser._id,
      sourceModel: 'User',
      target: user._id,
      targetModel: 'User',
      type: GraphType.BLOCK,
    }) : Promise.resolve(0),
    // Get total count of active users (users with calcLevelsCompletedCount > 0) for rarity calculations
    countUsersWhoCompletedOneLevel(),
    // Get achievement statistics for rarity calculations
    profileTab === ProfileTab.Achievements ? AchievementModel.aggregate([
      {
        $group: {
          _id: { type: '$type', gameId: '$gameId' },
          count: { $sum: 1 },
          firstEarned: { $min: '$createdAt' },
          lastEarned: { $max: '$createdAt' }
        }
      }
    ]) : Promise.resolve([]),
  ]);

  const levelsSolved = levelsSolvedAgg?.at(0)?.count ?? 0;

  const profilePageProps = {
    achievements: JSON.parse(JSON.stringify(achievements)),
    achievementStats: JSON.parse(JSON.stringify(achievementStats)),
    achievementsCount: achievementsCount,
    collectionsCount: collectionsCount,
    followers: JSON.parse(JSON.stringify([])),
    following: JSON.parse(JSON.stringify([])),
    levelsCount: levelsCount,
    levelsSolved: levelsSolved,
    multiplayerCount: multiplayerCount,
    pageProp: page,
    profileTab: profileTab,
    reqUser: reqUser ? JSON.parse(JSON.stringify(reqUser)) : null,
    reqUserIsFollowing: false,
    reqUserHasBlocked: blockData > 0,
    reviewsReceived: JSON.parse(JSON.stringify(reviewsReceived)),
    reviewsReceivedCount: reviewsReceivedCount,
    reviewsWritten: JSON.parse(JSON.stringify(reviewsWritten)),
    reviewsWrittenCount: reviewsWrittenCount,
    totalActiveUsers: totalActiveUsers,
    user: JSON.parse(JSON.stringify(user)),
  } as ProfilePageProps;

  // Filter out reviews if the user is blocked
  if (blockData > 0) {
    // If the user is viewing reviews-written by a blocked user, return empty arrays
    if (profileTab === ProfileTab.ReviewsWritten) {
      profilePageProps.reviewsWritten = [];
      profilePageProps.reviewsWrittenCount = 0;
    }

    // If the user is viewing reviews-received by a blocked user, return empty arrays
    if (profileTab === ProfileTab.ReviewsReceived) {
      profilePageProps.reviewsReceived = [];
      profilePageProps.reviewsReceivedCount = 0;
    }
  }

  if (profileTab === ProfileTab.Profile) {
    const [
      followData,
      followerAgg,
      followingAgg,
    ] = await Promise.all([
      getFollowData(user._id.toString(), reqUser),
      GraphModel.aggregate<IsFollowingGraph>([
        { $match: { target: new Types.ObjectId(userId), type: GraphType.FOLLOW } },
        {
          $lookup: {
            from: UserModel.collection.name,
            localField: 'source',
            foreignField: '_id',
            as: 'source',
            pipeline: [
              { $project: { name: 1, avatarUpdatedAt: 1, last_visited_at: 1, hideStatus: 1 } },
            ],
          },
        },
        { $unwind: '$source' },
        ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'source._id', lookupAs: 'source.config' }),
        { $sort: { createdAt: -1 } },
        // isFollowing field if the reqUser is following the source
        {
          $lookup: {
            from: GraphModel.collection.name,
            let: { targetId: '$source._id', sourceId: new Types.ObjectId(reqUser?._id) },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ['$target', '$$targetId'] }, { $eq: ['$source', '$$sourceId'] }] } } },
            ],
            as: 'follows',
          },
        },
        {
          $addFields: {
            isFollowing: { $gt: [{ $size: '$follows' }, 0] },
          },
        },
      ]).exec(),
      GraphModel.aggregate<IsFollowingGraph>([
        { $match: { source: new Types.ObjectId(userId), type: GraphType.FOLLOW } },
        {
          $lookup: {
            from: UserModel.collection.name,
            localField: 'target',
            foreignField: '_id',
            as: 'target',
            pipeline: [
              { $project: { name: 1, avatarUpdatedAt: 1, last_visited_at: 1, hideStatus: 1 } },
            ],
          },
        },
        { $unwind: '$target' },
        ...getEnrichUserConfigPipelineStage(gameId, { excludeCalcs: true, localField: 'target._id', lookupAs: 'target.config' }),
        { $sort: { createdAt: -1 } },
        // isFollowing field if the reqUser is following the target
        {
          $lookup: {
            from: GraphModel.collection.name,
            let: { targetId: '$target._id', sourceId: new Types.ObjectId(reqUser?._id) },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ['$target', '$$targetId'] }, { $eq: ['$source', '$$sourceId'] }] } } },
            ],
            as: 'follows',
          },
        },
        {
          $addFields: {
            isFollowing: { $gt: [{ $size: '$follows' }, 0] },
          },
        },
      ]).exec(),
    ]);

    profilePageProps.reqUserIsFollowing = followData.isFollowing ?? false;

    const followers = followerAgg.map((f) => {
      cleanUser(f.source as User);

      return f;
    }).sort((a, b) => a.createdAt < b.createdAt ? 1 : -1);

    profilePageProps.followers = JSON.parse(JSON.stringify(followers));

    const following = followingAgg.map((f) => {
      cleanUser(f.target as User);

      return f;
    }).sort((a, b) => a.createdAt < b.createdAt ? 1 : -1);

    profilePageProps.following = JSON.parse(JSON.stringify(following));
  }

  if (profileTab === ProfileTab.Collections) {
    const collectionsAgg = await getCollections({
      matchQuery: {
        ...(gameId !== undefined ? { gameId: gameId } : {}),
        userId: user._id,
      },
      populateLevelData: false,
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

    const query = await doQuery(gameId, searchQuery, reqUser, { ...LEVEL_DEFAULT_PROJECTION });

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

interface ProfilePageProps {
  achievements: Achievement[];
  achievementStats: Array<{
    _id: { type: AchievementType; gameId: GameId };
    count: number;
    firstEarned: Date;
    lastEarned: Date;
  }>;
  achievementsCount: number;
  collectionsCount: number;
  enrichedCollections: EnrichedCollection[] | undefined;
  enrichedLevels: EnrichedLevel[] | undefined;
  followers: IsFollowingGraph[];
  following: IsFollowingGraph[];
  levelsCount: number;
  levelsSolved: number;
  multiplayerCount: number;
  pageProp: number;
  profileTab: ProfileTab;
  reqUser: User | null;
  reqUserIsFollowing: boolean;
  reqUserHasBlocked: boolean;
  reviewsReceived?: Review[];
  reviewsReceivedCount: number;
  reviewsWritten?: Review[];
  reviewsWrittenCount: number;
  searchQuery: SearchQuery | undefined;
  totalActiveUsers: number;
  totalRows: number | undefined;
  user: User;
}

/* istanbul ignore next */
export default function ProfilePage({
  achievements,
  achievementStats,
  achievementsCount,
  collectionsCount,
  enrichedCollections,
  enrichedLevels,
  followers,
  following,
  levelsCount,
  levelsSolved,
  multiplayerCount,
  pageProp,
  profileTab,
  reqUser,
  reqUserIsFollowing,
  reqUserHasBlocked,
  reviewsReceived,
  reviewsReceivedCount,
  reviewsWritten,
  reviewsWrittenCount,
  searchQuery,
  totalActiveUsers,
  totalRows,
  user,
}: ProfilePageProps) {
  const { game } = useContext(AppContext);
  const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false);
  const [isFollowerOpen, setIsFollowerOpen] = useState(false);
  const [isFollowingOpen, setIsFollowingOpen] = useState(false);
  const ownProfile = reqUser?._id.toString() === user?._id.toString();
  const [page, setPage] = useState(pageProp);
  const router = useRouter();
  const [searchLevelText, setSearchLevelText] = useState('');
  const [showLevelFilter, setShowLevelFilter] = useState(StatFilter.All);
  const [tab, setTab] = useState(profileTab);

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

    const sortedEnrichedCollections = naturalSort(enrichedCollections, playLaterCompareFn);

    return sortedEnrichedCollections.map(enrichedCollection => {
      return {
        href: `/collection/${enrichedCollection.slug}`,
        id: enrichedCollection._id.toString(),
        gameId: enrichedCollection.gameId,
        searchLabel: enrichedCollection.name,
        stats: new SelectOptionStats(enrichedCollection.levelCount, enrichedCollection.userSolvedCount),
        text: <>
          {enrichedCollection.name}
          {ownProfile &&
            <div className='flex justify-center items-center gap-1 italic text-sm'>
              {enrichedCollection.isPrivate ?
                <>
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z' />
                  </svg>
                  Private
                </>
                :
                <>
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036m0 0l-.177-.529A2.25 2.25 0 0017.128 15H16.5l-.324-.324a1.453 1.453 0 00-2.328.377l-.036.073a1.586 1.586 0 01-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821.846 0 1.598.542 1.865 1.345l.215.643m5.276-3.67a9.012 9.012 0 01-5.276 3.67m0 0a9 9 0 01-10.275-4.835M15.75 9c0 .896-.393 1.7-1.016 2.25' />
                  </svg>
                  Public
                </>
              }
            </div>
          }
        </>,
      } as SelectOption;
    });
  }, [enrichedCollections, ownProfile]);

  const collectionsAsOptions = getCollectionOptions();

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

  // TODO: no SWR here
  const { data: profileDataFetched } = useSWRHelper<{levelsSolvedByDifficulty: {[key: string]: number}}>('/api/user/' + user?._id + '?type=levelsSolvedByDifficulty', {}, {}, tab !== ProfileTab.Profile);

  const levelsSolvedByDifficulty = profileDataFetched?.levelsSolvedByDifficulty;
  const difficultyType = game.type === GameType.COMPLETE_AND_SHORTEST ? 'Completed' : 'Solved';
  const streakRank = STREAK_RANK_GROUPS[getStreakRankIndex(user.config?.calcCurrentStreak ?? 0)];

  // Block/unblock user function
  const toggleBlockUser = async () => {
    const method = reqUserHasBlocked ? 'DELETE' : 'PUT';

    try {
      const response = await fetch(`/api/follow?action=${GraphType.BLOCK}&id=${user._id}&targetModel=User`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Refresh the page to update the UI
        router.reload();
      }
    } catch (error) {
      console.error('Error toggling block status:', error);
    }
  };

  // create an array of objects with the id, trigger element (eg. button), and the content element
  const tabsContent = {
    [ProfileTab.Profile]: (
      <SpaceBackground
        starCount={60}
        constellationPattern='default'
        showGeometricShapes={true}
        className='min-h-0 mx-2 sm:mx-0 rounded-xl'
      >
        <div className='flex flex-col items-center min-h-screen px-4 py-8'>
          {/* Profile Hero Section */}
          <div className='text-center mb-8 animate-fadeInDown' style={{ animationDelay: '0.3s' }}>
            {/* Simple centered avatar */}
            <div className='mb-6 flex justify-center'>
              <ProfileAvatar size={Dimensions.AvatarSizeLarge} user={user} />
            </div>
            
            {/* User name and role */}
            <div className='flex items-center justify-center gap-3 mb-4'>
              <h1 className='text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400'>
                {user.name}
              </h1>
              <RoleIcons id='profile' size={32} user={user} />
            </div>
            
            {/* Player rank */}
            {!game.isNotAGame && (
              <div className='flex justify-center mb-4'>
                {levelsSolvedByDifficulty ? (
                  <PlayerRank levelsSolvedByDifficulty={levelsSolvedByDifficulty} tooltip='Highest unlocked skill achievement' user={user} />
                ) : (
                  <LoadingSpinner size={24} />
                )}
              </div>
            )}
            
            {/* Bio */}
            {user.bio && !reqUserHasBlocked && (
              <p className='text-gray-300 text-lg max-w-2xl mx-auto mb-6 italic'>
                {user.bio}
              </p>
            )}
            
            {/* Social actions */}
            <div className='flex flex-wrap gap-4 justify-center items-center mb-6'>
              {reqUser && reqUser._id.toString() !== user._id.toString() && !reqUserHasBlocked && (
                <>
                  <FollowButton
                    isFollowing={reqUserIsFollowing}
                    key={user._id.toString()}
                    user={user}
                  />
                  <button
                    className='group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300'
                    onClick={toggleBlockUser}
                  >
                    <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
                    <div className='relative flex items-center gap-2'>
                      <span>🚫</span>
                      <span>Block</span>
                    </div>
                  </button>
                </>
              )}
              
              {/* Follower counts */}
              <div className='flex gap-6'>
                <button
                  className='text-white hover:text-cyan-400 transition-colors'
                  onClick={() => {
                    if (followers.length !== 0) {
                      setIsFollowerOpen(true);
                    }
                  }}
                >
                  <span className='font-bold text-xl'>{followers.length}</span>
                  <br />
                  <span className='text-sm opacity-70'>Follower{followers.length === 1 ? '' : 's'}</span>
                </button>
                <button
                  className='text-white hover:text-cyan-400 transition-colors'
                  onClick={() => {
                    if (following.length !== 0) {
                      setIsFollowingOpen(true);
                    }
                  }}
                >
                  <span className='font-bold text-xl'>{following.length}</span>
                  <br />
                  <span className='text-sm opacity-70'>Following</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Blocked user message */}
          {reqUserHasBlocked ? (
            <div className='bg-red-900/50 backdrop-blur-sm border border-red-500/30 rounded-xl p-6 text-center max-w-md mx-auto animate-fadeInUp' style={{ animationDelay: '0.5s' }}>
              <h3 className='font-bold text-xl text-red-400 mb-4'>You have blocked {user.name}</h3>
              <p className='text-red-200 mb-4'>
                Their user generated content is hidden and they cannot view your content.
                <br />
                If you believe this person is violating our terms of service, or for more help, visit our <a href='https://discord.gg/j6RxRdqq4A' target='_blank' rel='noopener noreferrer' className='text-blue-400 underline'>Discord server</a>.
              </p>
              <button
                className='px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition-all duration-300'
                onClick={toggleBlockUser}
              >
                Unblock User
              </button>
            </div>
          ) : (
            <>
              {/* Content Sections */}
              <div className='w-full max-w-6xl space-y-8'>
                {/* Two Column Layout: Stats and Difficulty */}
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeInUp' style={{ animationDelay: '0.7s' }}>
                  {/* Left Column - Game Statistics or Game Profiles */}
                  <div className='bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl p-6'>
                    <h3 className='text-2xl font-bold text-white mb-6 flex items-center gap-3'>
                      <span>{game.id === GameId.THINKY ? '🎮' : '📊'}</span>
                      {game.id === GameId.THINKY ? 'View Game Profiles' : 'Game Statistics'}
                    </h3>
                    
                    {game.id === GameId.THINKY ? (
                      /* Game Profiles for THINKY */
                      <div className='space-y-3'>
                        <p className='text-gray-300 text-sm mb-4'>View this user&apos;s profile on different games:</p>
                        {Object.values(Games).filter(g => !g.isNotAGame).map((gameOption) => (
                          <Link
                            key={gameOption.id}
                            href={`${gameOption.baseUrl}/profile/${user.name}`}
                            className='group flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200 border border-white/10 hover:border-white/20'
                          >
                            <img src={gameOption.logo} alt={gameOption.displayName} className='w-8 h-8' />
                            <div className='flex-1'>
                              <div className='font-bold text-white group-hover:text-cyan-400 transition-colors'>
                                {gameOption.displayName}
                              </div>
                              <div className='text-sm text-gray-400'>
                                {gameOption.shortDescription || gameOption.subtitle}
                              </div>
                            </div>
                            <div className='text-gray-400 group-hover:text-white transition-colors'>
                              →
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      /* Regular Game Statistics */
                      <>
                        <div className='grid grid-cols-2 gap-4 mb-6'>
                          {!game.disableRanked && (
                            <Link
                              href='/ranked'
                              className='group text-center p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200 cursor-pointer'
                            >
                              <div className='text-2xl font-bold text-yellow-400 group-hover:text-yellow-300 transition-colors'>
                                {user.config?.calcRankedSolves ?? 0}
                              </div>
                              <div className='text-sm text-gray-300 group-hover:text-white transition-colors'>
                                Ranked Solves 🏅
                              </div>
                            </Link>
                          )}
                          {(user.config?.calcCurrentStreak || 0) > 0 && (
                            <div className='text-center p-4 bg-white/5 rounded-lg'>
                              <div className='text-2xl font-bold text-orange-400 flex items-center justify-center gap-2'>
                                {user.config?.calcCurrentStreak ?? 0}
                                <span data-tooltip-content={streakRank.title} data-tooltip-id='streak-tooltip'>
                                  {streakRank.emoji}
                                </span>
                                <StyledTooltip id='streak-tooltip' />
                              </div>
                              <div className='text-sm text-gray-300'>Current Streak</div>
                            </div>
                          )}
                          <div className='text-center p-4 bg-white/5 rounded-lg'>
                            <div className='text-2xl font-bold text-green-400'>{user.config?.calcLevelsSolvedCount ?? 0}</div>
                            <div className='text-sm text-gray-300'>Levels Solved</div>
                          </div>
                          <div className='text-center p-4 bg-white/5 rounded-lg'>
                            <div className='text-2xl font-bold text-blue-400'>{user.config?.calcLevelsCompletedCount ?? 0}</div>
                            <div className='text-sm text-gray-300'>Levels Completed</div>
                          </div>
                        </div>
                        
                        {/* Additional info for games */}
                        <div className='pt-4 border-t border-white/10 space-y-3'>
                          {user.hideStatus || !user.ts ? null : isOnline(user) ? (
                            <div className='flex items-center justify-between'>
                              <span className='text-gray-300'>Currently Playing</span>
                              <GameLogoAndLabel gameId={user.lastGame ?? GameId.THINKY} id={'profile'} size={20} />
                            </div>
                          ) : (
                            <div className='flex items-center justify-between'>
                              <span className='text-gray-300'>Last Seen</span>
                              <FormattedDate
                                style={{ color: 'rgb(156 163 175)', fontSize: '1rem' }}
                                ts={user.last_visited_at ? user.last_visited_at : user.ts}
                              />
                            </div>
                          )}
                          <div className='flex items-center justify-between'>
                            <span className='text-gray-300'>Registered</span>
                            <span className='text-gray-400'>
                              {user.ts ? <FormattedDate
                                style={{ color: 'rgb(156 163 175)', fontSize: '1rem' }}
                                ts={user.ts}
                              /> : 'Not registered'}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Right Column - User Info for THINKY or Difficulty Breakdown for Games */}
                  <div className='bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl p-6'>
                    {game.id === GameId.THINKY ? (
                      /* User Activity Info for THINKY */
                      <>
                        <h3 className='text-2xl font-bold text-white mb-6 flex items-center gap-3'>
                          <span>👤</span>
                          User Information
                        </h3>
                        <div className='space-y-4'>
                          {user.hideStatus || !user.ts ? null : isOnline(user) ? (
                            <div className='flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg'>
                              <span className='text-gray-300 font-medium'>Currently Playing</span>
                              <GameLogoAndLabel gameId={user.lastGame ?? GameId.THINKY} id={'profile'} size={20} />
                            </div>
                          ) : (
                            <div className='flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg'>
                              <span className='text-gray-300 font-medium'>Last Seen</span>
                              <FormattedDate
                                style={{ color: 'rgb(156 163 175)', fontSize: '1rem' }}
                                ts={user.last_visited_at ? user.last_visited_at : user.ts}
                              />
                            </div>
                          )}
                          <div className='flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg'>
                            <span className='text-gray-300 font-medium'>Registered</span>
                            <span className='text-gray-400'>
                              {user.ts ? <FormattedDate
                                style={{ color: 'rgb(156 163 175)', fontSize: '1rem' }}
                                ts={user.ts}
                              /> : 'Not registered'}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Difficulty Breakdown for Games */
                      <>
                        <h3 className='text-2xl font-bold text-white mb-6 flex items-center gap-3'>
                          <span>🎯</span>
                          Levels {difficultyType} by Difficulty
                        </h3>
                        {levelsSolvedByDifficulty ? (
                          <LevelsSolvedByDifficultyList levelsSolvedByDifficulty={levelsSolvedByDifficulty} />
                        ) : (
                          <div className='flex justify-center p-4'>
                            <LoadingSpinner />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {/* Comment Wall - Full Width */}
                <div className='animate-fadeInUp' style={{ animationDelay: '0.9s' }}>
                  <CommentWall userId={user._id} />
                </div>
              </div>
              
              {/* Modals */}
              <FollowerModal
                closeModal={() => setIsFollowerOpen(false)}
                followers={followers}
                isOpen={isFollowerOpen}
              />
              <FollowingModal
                closeModal={() => setIsFollowingOpen(false)}
                following={following}
                isOpen={isFollowingOpen}
              />
            </>
          )}
        </div>
      </SpaceBackground>
    ),
    [ProfileTab.Insights]: (
      <SpaceBackground
        starCount={60}
        constellationPattern='default'
        showGeometricShapes={true}
        className='min-h-0 mx-2 sm:mx-0 rounded-xl'
      >
        <div className='flex flex-col items-center min-h-screen px-4 py-8'>
          <div className='text-center mb-8 animate-fadeInDown' style={{ animationDelay: '0.3s' }}>
            <h1 className='text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 mb-4'>
              📈 Analytics Hub
            </h1>
            <p className='text-gray-300 text-lg max-w-2xl mx-auto'>
              Deep insights into {user.name}&apos;s puzzle-solving journey and performance metrics
            </p>
          </div>
          
          <div className='w-full max-w-6xl animate-fadeInUp' style={{ animationDelay: '0.5s' }}>
            <ProfileInsights reqUser={reqUser} user={user} />
          </div>
        </div>
      </SpaceBackground>
    ),
    [ProfileTab.Multiplayer]: (
      <SpaceBackground
        starCount={60}
        constellationPattern='default'
        showGeometricShapes={true}
        className='min-h-0 mx-2 sm:mx-0 rounded-xl'
      >
        <div className='flex flex-col items-center min-h-screen px-4 py-8'>
          <div className='text-center mb-8 animate-fadeInDown' style={{ animationDelay: '0.3s' }}>
            <h1 className='text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 mb-4'>
              ⚔️ Battle Arena
            </h1>
            <p className='text-gray-300 text-lg max-w-2xl mx-auto'>
              {user.name}&apos;s competitive multiplayer matches and head-to-head battle history
            </p>
          </div>
          
          <div className='w-full max-w-6xl animate-fadeInUp' style={{ animationDelay: '0.5s' }}>
            <ProfileMultiplayer user={user} />
          </div>
        </div>
      </SpaceBackground>
    ),
    [ProfileTab.Collections]: (
      <SpaceBackground
        starCount={60}
        constellationPattern='default'
        showGeometricShapes={true}
        className='min-h-0 mx-2 sm:mx-0 rounded-xl'
      >
        <div className='flex flex-col items-center min-h-screen px-4 py-8'>
          <div className='text-center mb-8 animate-fadeInDown' style={{ animationDelay: '0.3s' }}>
            <h1 className='text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 mb-4'>
              📚 Collections Vault
            </h1>
            <p className='text-gray-300 text-lg max-w-2xl mx-auto'>
              Curated puzzle collections and handpicked level sets by {user.name}
            </p>
          </div>
          
          <div className='w-full max-w-4xl animate-fadeInUp' style={{ animationDelay: '0.5s' }}>
            {reqUser?._id === user._id && (
              <div className='text-center mb-6'>
                <button
                  className='group relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300'
                  onClick={() => {
                    setIsAddCollectionOpen(true);
                  }}
                >
                  <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
                  <div className='relative flex items-center gap-2'>
                    <span>➕</span>
                    <span>Create Collection</span>
                  </div>
                </button>
              </div>
            )}
            <AddCollectionModal
              closeModal={() => {
                setIsAddCollectionOpen(false);
              }}
              isOpen={isAddCollectionOpen}
            />
            {collectionsAsOptions.length === 0 ? (
              <div className='text-center py-12 animate-fadeInUp' style={{ animationDelay: '0.7s' }}>
                <div className='text-6xl mb-4'>📦</div>
                <div className='text-xl text-gray-300'>No collections yet!</div>
                <div className='text-gray-400 mt-2'>Create your first collection to get started</div>
              </div>
            ) : (
              <div className='animate-fadeInUp' style={{ animationDelay: '0.7s' }}>
                <Select options={collectionsAsOptions} />
              </div>
            )}
          </div>
        </div>
      </SpaceBackground>
    ),
    [ProfileTab.Levels]: (
      <SpaceBackground
        starCount={60}
        constellationPattern='default'
        showGeometricShapes={true}
        className='min-h-0 mx-2 sm:mx-0 rounded-xl'
      >
        <div className='flex flex-col items-center min-h-screen px-4 py-8'>
          <div className='text-center mb-8 animate-fadeInDown' style={{ animationDelay: '0.3s' }}>
            <h1 className='text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-green-400 to-blue-400 mb-4'>
              🎨 Created Levels
            </h1>
            <p className='text-gray-300 text-lg max-w-2xl mx-auto mb-4'>
              Explore the levels crafted by {user.name}
            </p>
            {reqUser && (
              <div className='bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3 inline-block'>
                <div
                  className='font-bold text-xl flex items-center gap-2'
                  style={{
                    color: levelsSolved === levelsCount ? 'var(--color-complete)' : 'white',
                  }}
                >
                  <span>{levelsSolved} / {levelsCount}</span>
                  {levelsSolved === levelsCount && <Solved className='w-8 h-8' />}
                </div>
              </div>
            )}
          </div>
          
          <div className='w-full max-w-6xl space-y-6 animate-fadeInUp' style={{ animationDelay: '0.5s' }}>
            <div className='bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl p-6'>
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
            </div>
            
            <div className='flex flex-wrap justify-center gap-4 mb-6'>
              {reqUser?._id === user._id && (
                <Link
                  className='group relative overflow-hidden bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center gap-2'
                  href='/create'
                >
                  <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
                  <div className='relative flex items-center gap-2'>
                    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='2 2 20 20' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
                    </svg>
                    <span>Create Level</span>
                  </div>
                </Link>
              )}
              <Link
                className='bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300'
                href={'/search?timeRange=All&searchAuthor=' + user.name}
              >
                🔍 Advanced Search
              </Link>
            </div>
            
            <div className='flex flex-wrap justify-center gap-4 animate-fadeInUp' style={{ animationDelay: '0.7s' }}>
              {enrichedLevels?.map((level) => {
                return (
                  <LevelCard
                    id='profile'
                    key={level._id.toString()}
                    level={level}
                  />
                );
              })}
            </div>
            
            {totalRows !== undefined && totalRows > 20 && (
              <div className='flex justify-center gap-4 mt-8 animate-fadeInUp' style={{ animationDelay: '0.9s' }}>
                {page > 1 && (
                  <Link
                    className='bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300'
                    href={`/profile/${user.name}/${ProfileTab.Levels}?page=${page - 1}&search=${searchLevelText}&statFilter=${showLevelFilter}`}
                  >
                    ← Previous
                  </Link>
                )}
                <div className='bg-black/20 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 text-white font-medium'>
                  {page} of {Math.ceil(totalRows / 20)}
                </div>
                {totalRows > (page * 20) && (
                  <Link
                    className='bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300'
                    href={`/profile/${user.name}/${ProfileTab.Levels}?page=${page + 1}&search=${searchLevelText}&statFilter=${showLevelFilter}`}
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </SpaceBackground>
    ),
    [ProfileTab.ReviewsWritten]: [
      <SpaceBackground
        key='reviews-written-bg'
        starCount={60}
        constellationPattern='default'
        showGeometricShapes={true}
        className='min-h-0 mx-2 sm:mx-0 rounded-xl'
      >
        <div className='flex flex-col items-center min-h-screen px-4 py-8'>
          <div className='text-center mb-8 animate-fadeInDown' style={{ animationDelay: '0.3s' }}>
            <h1 className='text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 mb-4'>
              ✍️ Review Chronicles
            </h1>
            <p className='text-gray-300 text-lg max-w-2xl mx-auto'>
              Reviews and feedback shared by {user.name} with the puzzle community
            </p>
          </div>
          
          <div className='w-full max-w-4xl space-y-6 animate-fadeInUp' style={{ animationDelay: '0.5s' }}>
            {reqUserHasBlocked ? (
              <div className='bg-red-900/50 backdrop-blur-sm border border-red-500/30 rounded-xl p-6 text-center'>
                <p className='font-bold text-xl text-red-400 mb-2'>Reviews Hidden</p>
                <p className='text-red-200'>You have blocked this user, so their reviews are hidden.</p>
              </div>
            ) : reviewsWrittenCount === 0 ? (
              <div className='text-center py-12'>
                <div className='text-6xl mb-4'>📝</div>
                <div className='text-xl text-gray-300'>No reviews written yet!</div>
                <div className='text-gray-400 mt-2'>Be the first to share your thoughts on levels</div>
              </div>
            ) : (
              reviewsWritten?.map((review, index) => (
                <div
                  className='animate-fadeInUp'
                  key={`review-${review._id}`}
                  style={{ animationDelay: `${0.7 + index * 0.1}s` }}
                >
                  <FormattedReview
                    level={review.levelId}
                    review={review}
                    user={user}
                  />
                </div>
              ))
            )}
            
            {/* Pagination */}
            {reviewsWrittenCount > 10 && !reqUserHasBlocked && (
              <div className='flex justify-center gap-4 mt-8 animate-fadeInUp' style={{ animationDelay: '0.9s' }}>
                {page > 1 && (
                  <Link
                    className='bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300'
                    href={`/profile/${user.name}/${ProfileTab.ReviewsWritten}${page !== 2 ? `?page=${page - 1}` : ''}`}
                  >
                    ← Previous
                  </Link>
                )}
                <div className='bg-black/20 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 text-white font-medium'>
                  {page} of {Math.ceil(reviewsWrittenCount / 10)}
                </div>
                {reviewsWrittenCount > (page * 10) && (
                  <Link
                    className='bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300'
                    href={`/profile/${user.name}/${ProfileTab.ReviewsWritten}?page=${page + 1}`}
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </SpaceBackground>,
    ],
    [ProfileTab.ReviewsReceived]: (
      <SpaceBackground
        starCount={60}
        constellationPattern='default'
        showGeometricShapes={true}
        className='min-h-0 mx-2 sm:mx-0 rounded-xl'
      >
        <div className='flex flex-col items-center min-h-screen px-4 py-8'>
          <div className='text-center mb-8 animate-fadeInDown' style={{ animationDelay: '0.3s' }}>
            <h1 className='text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-teal-400 to-blue-400 mb-4'>
              💌 Feedback Gallery
            </h1>
            <p className='text-gray-300 text-lg max-w-2xl mx-auto'>
              Reviews and feedback that {user.name} has received from the puzzle community
            </p>
          </div>
          
          <div className='w-full max-w-4xl space-y-6 animate-fadeInUp' style={{ animationDelay: '0.5s' }}>
            {reqUserHasBlocked ? (
              <div className='bg-red-900/50 backdrop-blur-sm border border-red-500/30 rounded-xl p-6 text-center'>
                <p className='font-bold text-xl text-red-400 mb-2'>Reviews Hidden</p>
                <p className='text-red-200'>You have blocked this user, so their reviews are hidden.</p>
              </div>
            ) : reviewsReceivedCount === 0 ? (
              <div className='text-center py-12'>
                <div className='text-6xl mb-4'>📭</div>
                <div className='text-xl text-gray-300'>No reviews received yet!</div>
                <div className='text-gray-400 mt-2'>Create some levels to start receiving feedback</div>
              </div>
            ) : (
              reviewsReceived?.map((review, index) => (
                <div
                  className='animate-fadeInUp'
                  key={`review-${review._id}`}
                  style={{ animationDelay: `${0.7 + index * 0.1}s` }}
                >
                  <FormattedReview
                    level={review.levelId}
                    review={review}
                    user={review.userId}
                  />
                </div>
              ))
            )}
            
            {/* Pagination */}
            {reviewsReceivedCount > 10 && !reqUserHasBlocked && (
              <div className='flex justify-center gap-4 mt-8 animate-fadeInUp' style={{ animationDelay: '0.9s' }}>
                {page > 1 && (
                  <Link
                    className='bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300'
                    href={`/profile/${user.name}/${ProfileTab.ReviewsReceived}${page !== 2 ? `?page=${page - 1}` : ''}`}
                  >
                    ← Previous
                  </Link>
                )}
                <div className='bg-black/20 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 text-white font-medium'>
                  {page} of {Math.ceil(reviewsReceivedCount / 10)}
                </div>
                {reviewsReceivedCount > (page * 10) && (
                  <Link
                    className='bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300'
                    href={`/profile/${user.name}/${ProfileTab.ReviewsReceived}?page=${page + 1}`}
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </SpaceBackground>
    ),
    [ProfileTab.Achievements]: (
      <SpaceBackground
        starCount={60}
        constellationPattern='leaderboard'
        showGeometricShapes={true}
        className='min-h-0 mx-2 sm:mx-0 rounded-xl'
      >
        <div className='flex flex-col items-center min-h-screen px-4 py-8'>
          <div className='text-center mb-8 animate-fadeInDown' style={{ animationDelay: '0.3s' }}>
            <h1 className='text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 mb-4'>
              🏆 Trophy Hall
            </h1>
            <p className='text-gray-300 text-lg max-w-2xl mx-auto'>
              Celebrate {user.name}&apos;s accomplishments and milestones achieved on their puzzle journey
            </p>
          </div>
          
          <div className='w-full max-w-6xl animate-fadeInUp' style={{ animationDelay: '0.5s' }}>
            <ProfileAchievments achievements={achievements} achievementStats={achievementStats} totalActiveUsers={totalActiveUsers} reqUser={reqUser} />
          </div>
        </div>
      </SpaceBackground>
    ),
  } as { [key: string]: React.ReactNode | null };

  const getTabClassNames = useCallback((tabId: ProfileTab) => {
    return classNames(
      'group relative overflow-hidden transition-all duration-300 transform hover:scale-105',
      'inline-block px-4 py-3 rounded-xl font-medium',
      tab == tabId
        ? 'bg-gradient-to-r from-cyan-600/80 to-purple-600/80 backdrop-blur-sm border border-cyan-400/30 text-white shadow-lg shadow-cyan-500/25'
        : 'bg-black/20 backdrop-blur-sm border border-white/20 text-gray-300 hover:bg-black/30 hover:border-white/30 hover:text-white'
    );
  }, [tab]);

  const fullUrl = game.baseUrl + getProfileSlug(user) + '/' + profileTab;
  // should not have trailing slash
  const canonical = fullUrl.replace(/\/$/, '');

  return (
    <Page title={user.name}>
      <>
        <NextSeo
          title={`${user.name} - ${game.displayName}`}
          description={`${user.name}'s profile`}
          canonical={canonical}
          openGraph={{
            title: `${user.name} - ${game.displayName}`,
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
        <ProfilePageJsonLd
          type='ProfilePage'
          dateCreated={user.ts && new Date(user.ts * 1000).toISOString()}
          mainEntity={{
            '@type': 'Person',
            name: user.name,
            identifier: user._id.toString(),
            interactionStatistic: {
              '@type': 'InteractionCounter',
              interactionType: 'http://schema.org/FollowAction',
              userInteractionCount: followers.length,
            },
            description: user.bio,
            image: user.avatarUpdatedAt ? `/api/avatar/${user._id}.png` : '/avatar_default.png',
          }}
          breadcrumb={[
            {
              name: game.displayName,
              position: 1,
              item: game.baseUrl,
            },
            {
              name: user.name,
              position: 2,
              item: game.baseUrl + getProfileSlug(user),
            },
          ]}

        />
        <div className='flex flex-wrap text-sm text-center gap-2 mt-2 justify-center items-center'>
          <Link
            className={getTabClassNames(ProfileTab.Profile)}
            href={`/profile/${user.name}`}
          >
            <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-0 group-hover:opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-all duration-700' />
            <div className='relative flex flex-row items-center gap-2'>
              <ProfileAvatar size={24} user={user} />
              <span>Profile</span>
            </div>
          </Link>
          {!game.isNotAGame && !reqUserHasBlocked &&
            <>
              <Link
                className={getTabClassNames(ProfileTab.Insights)}
                href={`/profile/${user.name}/${ProfileTab.Insights}`}
              >
                <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-0 group-hover:opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-all duration-700' />
                <div className='relative flex flex-row items-center gap-2'>
                  <Image alt='pro' src='/pro.svg' width='16' height='16' />
                  <span>Insights</span>
                </div>
              </Link>
            </>
          }
          <Link
            className={getTabClassNames(ProfileTab.Achievements)}
            href={`/profile/${user.name}/${ProfileTab.Achievements}`}
          >
            <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-0 group-hover:opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-all duration-700' />
            <div className='relative flex flex-row items-center gap-2'>
              <span>🏆</span>
              <span>Achievements ({achievementsCount})</span>
            </div>
          </Link>
          {!reqUserHasBlocked &&
            <>
              <Link
                className={getTabClassNames(ProfileTab.Levels)}
                href={`/profile/${user.name}/${ProfileTab.Levels}`}
              >
                <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-0 group-hover:opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-all duration-700' />
                <div className='relative flex flex-row items-center gap-2'>
                  <span>🎨</span>
                  <span>Levels ({levelsCount})</span>
                </div>
              </Link>
              <Link
                className={getTabClassNames(ProfileTab.Collections)}
                href={`/profile/${user.name}/${ProfileTab.Collections}`}
              >
                <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-0 group-hover:opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-all duration-700' />
                <div className='relative flex flex-row items-center gap-2'>
                  <span>📚</span>
                  <span>Collections ({collectionsCount})</span>
                </div>
              </Link>
              <Link
                className={getTabClassNames(ProfileTab.Multiplayer)}
                href={`/profile/${user.name}/${ProfileTab.Multiplayer}`}
              >
                <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-0 group-hover:opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-all duration-700' />
                <div className='relative flex flex-row items-center gap-2'>
                  <span>⚔️</span>
                  <span>Multiplayer ({multiplayerCount})</span>
                </div>
              </Link>
              <Link
                className={getTabClassNames(ProfileTab.ReviewsWritten)}
                href={`/profile/${user.name}/${ProfileTab.ReviewsWritten}`}
              >
                <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-0 group-hover:opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-all duration-700' />
                <div className='relative flex flex-row items-center gap-2'>
                  <span>✍️</span>
                  <span>Reviews Written ({reviewsWrittenCount})</span>
                </div>
              </Link>
              <Link
                className={getTabClassNames(ProfileTab.ReviewsReceived)}
                href={`/profile/${user.name}/${ProfileTab.ReviewsReceived}`}
              >
                <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-0 group-hover:opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-all duration-700' />
                <div className='relative flex flex-row items-center gap-2'>
                  <span>💌</span>
                  <span>Reviews Received ({reviewsReceivedCount})</span>
                </div>
              </Link>
            </>
          }
        </div>
        <div className='tab-content'>
          <div className='p-4' id='content' role='tabpanel' aria-labelledby='tabs-home-tabFill'>
            {reqUserHasBlocked && tab !== ProfileTab.Profile ? (
              <div className='text-center p-4 bg-red-100 dark:bg-red-900 rounded-lg'>
                <p className='font-bold mb-2'>You have blocked {user.name}</p>
                <p className='mb-4'>
              Their user generated content is hidden and they cannot view your content.
                  <br />
                  If you believe this person is violating our terms of service, or for more help, visit our <a className='text-blue-500 underline' href='https://discord.gg/j6RxRdqq4A' target='_blank' rel='noopener noreferrer'>Discord server</a>.
                </p>
                <button
                  className='px-3 py-1 rounded-md bg-green-500 hover:bg-green-600'
                  onClick={toggleBlockUser}
                >
                  Unblock User
                </button>
              </div>
            ) : (
              tabsContent[tab]
            )}
          </div>
        </div>
      </>
    </Page>
  );
}
