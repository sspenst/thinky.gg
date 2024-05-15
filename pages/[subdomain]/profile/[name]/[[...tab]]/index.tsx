import LevelCard from '@root/components/cards/levelCard';
import FormattedDate from '@root/components/formatted/formattedDate';
import GameLogoAndLabel from '@root/components/gameLogoAndLabel';
import Solved from '@root/components/level/info/solved';
import FollowerModal from '@root/components/modal/followerModal';
import FollowingModal from '@root/components/modal/followingModal';
import LoadingSpinner from '@root/components/page/loadingSpinner';
import RoleIcons from '@root/components/page/roleIcons';
import LevelsSolvedByDifficultyList from '@root/components/profile/levelsSolvedByDifficultyList';
import PlayerRank from '@root/components/profile/playerRank';
import { ProfileAchievments } from '@root/components/profile/profileAchievements';
import ProfileMultiplayer from '@root/components/profile/profileMultiplayer';
import { GameId } from '@root/constants/GameId';
import { GameType } from '@root/constants/Games';
import StatFilter from '@root/constants/statFilter';
import { AppContext } from '@root/contexts/appContext';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
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
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { NextSeo, ProfilePageJsonLd } from 'next-seo';
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

  const gameId = getGameIdFromReq(context.req);
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

  const users = await getUsersWithMultiplayerProfile(gameId, { name: name }, { bio: 1, ts: 1, config: 1, lastGame: 1 });

  if (!users || users.length !== 1) {
    return {
      notFound: true
    };
  }

  const user = users[0];

  cleanUser(user);

  const userId = user._id.toString();
  const viewingOwnProfile = reqUser?._id.toString() === userId;
  const game = getGameFromId(getGameIdFromReq(context.req));
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
  ] = await Promise.all([
    profileTab === ProfileTab.Achievements ? AchievementModel.find<Achievement>({ userId: userId, gameId: gameId }) : [] as Achievement[],
    AchievementModel.countDocuments({ userId: userId, gameId: gameId }),
    !game.isNotAGame && CollectionModel.countDocuments({
      gameId: gameId,
      userId: userId,
      ...(!viewingOwnProfile && { isPrivate: { $ne: true } }),
    }),
    !game.isNotAGame && LevelModel.countDocuments({ isDeleted: { $ne: true }, isDraft: false, userId: userId, gameId: gameId }),
    !game.isNotAGame && profileTab === ProfileTab.Levels && reqUser ? LevelModel.aggregate([
      { $match: {
        gameId: gameId,
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
    !game.isNotAGame && MultiplayerMatchModel.countDocuments({ players: userId, state: MultiplayerMatchState.FINISHED, rated: true, gameId: gameId }),
    !game.isNotAGame && profileTab === ProfileTab.ReviewsReceived ? getReviewsForUserId(gameId, userId, reqUser, { limit: 10, skip: 10 * (page - 1) }) : [] as Review[],
    !game.isNotAGame && profileTab === ProfileTab.ReviewsWritten ? getReviewsByUserId(gameId, userId, reqUser, { limit: 10, skip: 10 * (page - 1) }) : [] as Review[],
    !game.isNotAGame && getReviewsForUserIdCount(gameId, userId),
    !game.isNotAGame && getReviewsByUserIdCount(gameId, userId),
  ]);

  const levelsSolved = levelsSolvedAgg?.at(0)?.count ?? 0;

  const profilePageProps = {
    achievements: JSON.parse(JSON.stringify(achievements)),
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
    reviewsReceived: JSON.parse(JSON.stringify(reviewsReceived)),
    reviewsReceivedCount: reviewsReceivedCount,
    reviewsWritten: JSON.parse(JSON.stringify(reviewsWritten)),
    reviewsWrittenCount: reviewsWrittenCount,
    user: JSON.parse(JSON.stringify(user)),
  } as ProfilePageProps;

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
      matchQuery: { gameId: gameId, userId: user._id },
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
  followers,
  following,
  levelsCount,
  levelsSolved,
  multiplayerCount,
  pageProp,
  profileTab,
  reqUser,
  reqUserIsFollowing,
  reviewsReceived,
  reviewsReceivedCount,
  reviewsWritten,
  reviewsWrittenCount,
  searchQuery,
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
  // create an array of objects with the id, trigger element (eg. button), and the content element
  const tabsContent = {
    [ProfileTab.Profile]: (user.ts ?
      <div className='flex flex-col gap-12 mt-4'>
        <div className='flex flex-col sm:flex-row gap-8 justify-center items-center max-w-full'>
          <div className='flex items-center justify-center'>
            <ProfileAvatar size={Dimensions.AvatarSizeLarge} user={user} />
          </div>
          <div className='flex flex-col items-center text-center sm:text-left sm:items-start gap-2 max-w-sm w-full sm:w-fit'>
            <div className='flex gap-2 items-center max-w-full'>
              <h2 className='text-3xl font-bold truncate'>{user.name}</h2>
              <RoleIcons id='profile' size={24} user={user} />
            </div>
            {!game.isNotAGame && <div className='flex gap-1'>
              {levelsSolvedByDifficulty ? <PlayerRank levelsSolvedByDifficulty={levelsSolvedByDifficulty} tooltip='Highest unlocked skill achievement' user={user} /> : '...'}
            </div>}
            <div className='flex gap-4 flex-wrap justify-center py-1'>
              <FollowButton
                isFollowing={reqUserIsFollowing}
                key={user._id.toString()}
                user={user}
              />
              <button
                onClick={() => {
                  if (followers.length !== 0) {
                    setIsFollowerOpen(true);
                  }
                }}
              >
                <span className='font-bold'>{followers.length}</span> follower{followers.length === 1 ? '' : 's'}
              </button>
              <button
                onClick={() => {
                  if (following.length !== 0) {
                    setIsFollowingOpen(true);
                  }
                }}
              >
                <span className='font-bold'>{following.length}</span> following
              </button>
            </div>
            {user.bio && <p className='italic text-sm break-words max-w-full'>{user.bio}</p>}
          </div>
        </div>
        <div className='flex flex-wrap justify-center text-left gap-x-20 gap-y-12'>
          <div className='flex flex-col gap-6 max-w-sm w-fit'>
            <div>
              {!game.isNotAGame && !game.disableRanked && <div><span className='font-bold'>Ranked Solves:</span> {user.config?.calcRankedSolves ?? 0} 🏅</div>}
              {!game.isNotAGame && <div><span className='font-bold'>Levels Solved:</span> {user.config?.calcLevelsSolvedCount ?? 0}</div>}
              {!game.isNotAGame && <div><span className='font-bold'>Levels Completed:</span> {user.config?.calcLevelsCompletedCount ?? 0}</div>}
              {user.hideStatus ? null : isOnline(user) ?
                <div className='flex flex-wrap gap-1 items-center'>
                  <span className='font-bold'>Currently Playing:</span>
                  <GameLogoAndLabel gameId={user.lastGame ?? GameId.THINKY} id={'profile'} size={20} />
                </div>
                :
                <div><span className='font-bold'>Last Seen:</span> <FormattedDate style={{ color: 'var(--color)', fontSize: '1rem' }} ts={user.last_visited_at ? user.last_visited_at : user.ts} /></div>
              }
              <div><span className='font-bold'>Registered:</span> <FormattedDate style={{ color: 'var(--color)', fontSize: '1rem' }} ts={user.ts} /></div>
            </div>
            {!game.isNotAGame &&
              <div>
                <div><span className='font-bold'>Levels {difficultyType} by Difficulty:</span></div>
                {levelsSolvedByDifficulty ?
                  <LevelsSolvedByDifficultyList levelsSolvedByDifficulty={levelsSolvedByDifficulty} />
                  :
                  <div className='p-2'><LoadingSpinner /></div>
                }
              </div>
            }
          </div>
          <CommentWall userId={user._id} />
        </div>
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
      </div>
      :
      <div className='text-center break-words'>
        {user.name} has not yet registered.
      </div>
    ),
    [ProfileTab.Insights]: <ProfileInsights reqUser={reqUser} user={user} />,
    [ProfileTab.Multiplayer]: <ProfileMultiplayer user={user} />,
    [ProfileTab.Collections]: (
      <div className='flex flex-col gap-2 justify-center'>
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
        <h1 className='font-bold text-3xl'>{user.name}&apos;s Levels</h1>
        {reqUser &&
          <h2
            className='font-bold text-xl flex items-center'
            style={{
              color: levelsSolved === levelsCount ? 'var(--color-complete)' : undefined,
            }}
          >
            <span>{levelsSolved} / {levelsCount}</span>
            {levelsSolved === levelsCount && <Solved className='w-8 h-8' />}
          </h2>
        }
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
            className='flex items-center gap-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer w-fit'
            href='/create'
          >
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='2 2 20 20' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
            </svg>
            <span className='text-lg font-bold'>Create Level</span>
          </Link>
        }
        <Link
          className='underline'
          href={'/search?timeRange=All&searchAuthor=' + user.name}
        >
          Advanced search
        </Link>
        <div className='flex flex-wrap justify-center gap-4'>
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
      <div className='flex flex-col items-center gap-4' key='reviews-written'>
        {reviewsWritten?.map(review => {
          return (
            <div
              className='max-w-3xl w-full'
              key={`review-${review._id}`}
            >
              <FormattedReview
                level={review.levelId}
                review={review}
                user={user}
              />
            </div>
          );
        })}
      </div>,
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
      <div className='flex flex-col items-center gap-4' key='reviews-received'>
        {reviewsReceived?.map(review => {
          return (
            <div
              className='max-w-3xl w-full'
              key={`review-${review._id}`}
            >
              <FormattedReview
                level={review.levelId}
                review={review}
                user={review.userId}
              />
            </div>
          );
        })}
      </div>,
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
            <div className='flex flex-row items-center gap-2'>
              <ProfileAvatar size={24} user={user} />
              <span>Profile</span>
            </div>
          </Link>
          {!game.isNotAGame &&
            <>
              <Link
                className={getTabClassNames(ProfileTab.Insights)}
                href={`/profile/${user.name}/${ProfileTab.Insights}`}
              >
                <div className='flex flex-row items-center gap-2'>
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
            <div className='flex flex-row items-center gap-2'>
              <span>🏆</span>
              <span>Achievements ({achievementsCount})</span>
            </div>
          </Link>
          {!game.isNotAGame &&
            <>
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
            </>
          }
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
