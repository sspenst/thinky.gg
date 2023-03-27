import RoleIcons from '@root/components/roleIcons';
import classNames from 'classnames';
import { debounce } from 'debounce';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useEffect, useState } from 'react';
import Avatar from '../../../../components/avatar';
import CommentWall from '../../../../components/commentWall';
import { getDifficultyList, getFormattedDifficulty } from '../../../../components/difficultyDisplay';
import FollowButton from '../../../../components/followButton';
import FollowingList from '../../../../components/followingList';
import FormattedAchievement from '../../../../components/formattedAchievement';
import FormattedReview from '../../../../components/formattedReview';
import AddCollectionModal from '../../../../components/modal/addCollectionModal';
import MultiSelectUser from '../../../../components/multiSelectUser';
import Page from '../../../../components/page';
import { ProAccountUserInsights } from '../../../../components/pro-account/pro-account-user-insights';
import Select from '../../../../components/select';
import SelectFilter from '../../../../components/selectFilter';
import AchievementInfo from '../../../../constants/achievementInfo';
import Dimensions from '../../../../constants/dimensions';
import GraphType from '../../../../constants/graphType';
import TimeRange from '../../../../constants/timeRange';
import { enrichCollection } from '../../../../helpers/enrich';
import filterSelectOptions, { FilterSelectOption } from '../../../../helpers/filterSelectOptions';
import getFormattedDate from '../../../../helpers/getFormattedDate';
import getProfileSlug from '../../../../helpers/getProfileSlug';
import { getReviewsByUserId, getReviewsByUserIdCount } from '../../../../helpers/getReviewsByUserId';
import { getReviewsForUserId, getReviewsForUserIdCount } from '../../../../helpers/getReviewsForUserId';
import isPro from '../../../../helpers/isPro';
import naturalSort from '../../../../helpers/naturalSort';
import cleanUser from '../../../../lib/cleanUser';
import dbConnect from '../../../../lib/dbConnect';
import { getUserFromToken } from '../../../../lib/withAuth';
import Achievement from '../../../../models/db/achievement';
import Collection, { EnrichedCollection } from '../../../../models/db/collection';
import { EnrichedLevel } from '../../../../models/db/level';
import Review from '../../../../models/db/review';
import User from '../../../../models/db/user';
import { AchievementModel, CollectionModel, GraphModel, LevelModel, StatModel, UserModel } from '../../../../models/mongoose';
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
  ReviewsWritten = 'reviews-written',
  ReviewsReceived = 'reviews-received',
}

export interface ProfileParams extends ParsedUrlQuery {
  name: string;
  tab: string[];
}

async function getCompletionByDifficultyTable(user: User) {
  const difficultyList = getDifficultyList();
  const difficultyListValues = difficultyList.map((d) => d.value);

  const levelsCompletedByDifficultyData = await StatModel.aggregate([
    {
      $match: {
        userId: user._id,
        complete: true,
        isDeleted: { $ne: true },
      },
    },
    {
      $project: {
        _id: 0,
        levelId: 1,
      }
    },
    {
      $lookup: {
        from: 'levels',
        localField: 'levelId',
        foreignField: '_id',
        as: 'levelInfo',
        pipeline: [
          {
            $match: {
              isDeleted: { $ne: true },
              isDraft: false,
            }
          },
          {
            $project: {
              _id: 0,
              calc_difficulty_estimate: 1
            }
          }
        ]
      },
    },
    {
      $unwind: '$levelInfo',
    },
    {
      $bucket: {
        groupBy: '$levelInfo.calc_difficulty_estimate',
        boundaries: difficultyListValues,
        default: difficultyListValues[difficultyListValues.length - 1],
        output: {
          count: { $sum: 1 }
        }
      },
    },
  ]);

  // map of difficulty value to levels completed
  const levelsCompletedByDifficulty: { [key: string]: number } = {};

  levelsCompletedByDifficultyData.map((d: {_id: string, count: number}) => {
    levelsCompletedByDifficulty[d._id] = d.count;
  });

  return levelsCompletedByDifficulty;
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

  await dbConnect();

  const user = await UserModel.findOne({ name: name }, '+bio', { lean: true });

  if (!user) {
    return {
      notFound: true
    };
  }

  cleanUser(user);

  const userId = user._id.toString();

  const [
    achievements,
    achievementsCount,
    collectionsCount,
    followData,
    levelsCompletedByDifficulty,
    levelsCount,
    reviewsReceived,
    reviewsWritten,
    reviewsReceivedCount,
    reviewsWrittenCount,
  ] = await Promise.all([
    profileTab === ProfileTab.Achievements ? AchievementModel.find<Achievement>({ userId: userId }) : [] as Achievement[],
    AchievementModel.countDocuments({ userId: userId }),
    CollectionModel.countDocuments({ userId: userId }),
    getFollowData(user._id.toString(), reqUser),
    profileTab === ProfileTab.Profile ? getCompletionByDifficultyTable(user) : {},
    LevelModel.countDocuments({ isDeleted: { $ne: true }, isDraft: false, userId: userId }),
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
    levelsCompletedByDifficulty: levelsCompletedByDifficulty,
    levelsCount: levelsCount,
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
      const followingGraph = await GraphModel.find({
        source: reqUser._id,
        type: GraphType.FOLLOW,
      }, 'target targetModel').populate('target', 'name avatarUpdatedAt last_visited_at hideStatus').exec();

      /* istanbul ignore next */
      const reqUserFollowing = followingGraph.map((f) => {
        cleanUser(f.target as User);

        return f.target as User;
      })
        .sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

      profilePageProps.reqUserFollowing = JSON.parse(JSON.stringify(reqUserFollowing));
    }
  }

  if (profileTab === ProfileTab.Collections) {
    const collections = await CollectionModel.find<Collection>({ userId: user._id }, 'levels name slug')
      .populate({
        path: 'levels',
        select: '_id leastMoves',
        match: { isDraft: false },
      })
      .sort({ name: 1 });
    const enrichedCollections = await Promise.all(collections.map(collection => enrichCollection(collection, reqUser)));

    profilePageProps.enrichedCollections = JSON.parse(JSON.stringify(enrichedCollections));
  }

  if (profileTab === ProfileTab.Levels) {
    const searchQuery: SearchQuery = {
      sort_by: 'name',
      sort_dir: 'asc',
      time_range: TimeRange[TimeRange.All]
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
  levelsCompletedByDifficulty: { [key: string]: number };
  levelsCount: number;
  pageProp: number;
  profileTab: ProfileTab;
  reqUser: User | null;
  reqUserFollowing: User[] | undefined;
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
  levelsCompletedByDifficulty,
  levelsCount,
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
  const [showCollectionFilter, setShowCollectionFilter] = useState(FilterSelectOption.All);
  const [showLevelFilter, setShowLevelFilter] = useState(FilterSelectOption.All);
  const [tab, setTab] = useState(ProfileTab.Profile);

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
    setShowLevelFilter(searchQuery?.show_filter || FilterSelectOption.All);
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
        stats: new SelectOptionStats(enrichedCollection.levelCount, enrichedCollection.userCompletedCount),
        text: enrichedCollection.name,
      } as SelectOption;
    });
  }, [enrichedCollections]);

  const getFilteredCollectionOptions = useCallback(() => {
    return filterSelectOptions(getCollectionOptions(), showCollectionFilter, collectionFilterText);
  }, [collectionFilterText, getCollectionOptions, showCollectionFilter]);

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
          show_filter: showLevelFilter,
        },
      });
    }, 500), [showLevelFilter, tab]);

  const onFilterCollectionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as FilterSelectOption;

    setShowCollectionFilter(showCollectionFilter === value ? FilterSelectOption.All : value);
    setPage(1);
  };

  const onFilterLevelClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as FilterSelectOption;

    router.push({
      pathname: `/profile/${user.name}/${tab}`,
      query: {
        page: 1,
        search: searchLevelText,
        show_filter: showLevelFilter === value ? FilterSelectOption.All : value,
      },
    });
  };

  const isReqProUser = reqUser && isPro(reqUser);

  // create an array of objects with the id, trigger element (eg. button), and the content element
  const tabsContent = {
    [ProfileTab.Profile]: (user.ts ?
      <>
        <div className='flex items-center justify-center mb-4'>
          <Avatar size={Dimensions.AvatarSizeLarge} user={user} />
        </div>
        <div className='flex gap-2 items-center justify-center'>
          <h2 className='text-3xl font-bold'>{user.name}</h2>
          <RoleIcons size={24} user={user} />
        </div>
        <p className='text-center italic text-sm break-words mt-2'>{user.bio || 'No bio'}</p>
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
            <h2><span className='font-bold'>Levels Completed:</span> {user.score}</h2>
            <h2><span className='font-bold'>Levels Created:</span> {user.calc_levels_created_count}</h2>
            {!user.hideStatus && <>
              <h2><span className='font-bold'>Last Seen:</span> {getFormattedDate(user.last_visited_at ? user.last_visited_at : user.ts)}</h2>
            </>}
            <h2><span className='font-bold'>Account Created:</span> {getFormattedDate(user.ts)}</h2>
            <h2><span className='font-bold'>Followers:</span> {followerCount}</h2>
            {levelsCompletedByDifficulty &&
              <div className='mt-4'>
                <h2><span className='font-bold'>Levels Completed by Difficulty:</span></h2>
                {getDifficultyList().reverse().map(difficulty => {
                  return (
                    <div className='flex text-sm' key={`${difficulty.name}-levels-completed`}>
                      <div className='w-10 text-right mr-2'>
                        {difficulty.value in levelsCompletedByDifficulty && levelsCompletedByDifficulty[difficulty.value] || 0}
                      </div>
                      {getFormattedDifficulty(difficulty.value)}
                    </div>
                  );
                })}
              </div>
            }
            {reqUser && reqUser._id.toString() === user._id.toString() && reqUserFollowing && (<>
              <div className='font-bold text-xl mt-4 mb-2 justify-center flex'>{`${reqUserFollowing.length} following:`}</div>
              <FollowingList users={reqUserFollowing} />
            </>)}
          </div>
          <CommentWall userId={user._id} />
        </div>
      </>
      :
      <div className='text-center'>
        {user.name} has not yet registered on Pathology.
      </div>
    ),
    [ProfileTab.Insights]: (
      (isReqProUser ? (
        <ProAccountUserInsights user={user} />
      ) : (
        <div className='m-4 text-center'>
          <div className='p-3'>Pro Account will unlock additional insights for {user.name}!</div>
          <Link className='p-3 bg-blue-500 rounded-md' href='/settings/proaccount'>Upgrade to Pro</Link>
        </div>
      ))
    ),
    [ProfileTab.Collections]: (
      <div className='flex flex-col gap-2 justify-center'>
        {getCollectionOptions().length > 0 &&
          <SelectFilter
            filter={showCollectionFilter}
            onFilterClick={onFilterCollectionClick}
            placeholder={`Search ${getFilteredCollectionOptions().length} collection${getFilteredCollectionOptions().length !== 1 ? 's' : ''}...`}
            searchText={collectionFilterText}
            setSearchText={setCollectionFilterText}
          />
        }
        {reqUser?._id === user._id &&
          <div className='text-center '>
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
        {getFilteredCollectionOptions().length === 0 ?
          <div className='p-3'>
            No collections!
          </div>
          :
          <Select options={getFilteredCollectionOptions()} />
        }
      </div>
    ),
    [ProfileTab.Levels]: (
      <div className='flex flex-col gap-2 justify-center'>
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
        <div className='flex justify-center'>
          <Link
            className='underline'
            href={'/search?time_range=All&searchAuthor=' + user.name}
          >
            Advanced search
          </Link>
        </div>
        <Select options={getLevelOptions()} />
        {totalRows !== undefined && totalRows > 20 &&
          <div className='flex justify-center flex-row'>
            {page > 1 && (
              <Link
                className='ml-2 underline'
                href={`/profile/${user.name}/${ProfileTab.Levels}?page=${page - 1}&search=${searchLevelText}&show_filter=${showLevelFilter}`}
              >
                Previous
              </Link>
            )}
            <div id='page-number' className='ml-2'>{page} of {Math.ceil(totalRows / 20)}</div>
            {totalRows > (page * 20) && (
              <Link
                className='ml-2 underline'
                href={`/profile/${user.name}/${ProfileTab.Levels}?page=${page + 1}&search=${searchLevelText}&show_filter=${showLevelFilter}`}
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
        <div>
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
      <div className='flex flex-wrap justify-center gap-8'>
        {Object.keys(AchievementInfo).map(achievementType => {
          const achievement = achievements.find(achievement => achievement.type === achievementType);

          if (!achievement) {
            return null;
          }

          return <FormattedAchievement achievement={achievement} key={`achievement-${achievement._id}`} />;
        })}
      </div>
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
            Profile
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
            className={getTabClassNames(ProfileTab.Collections)}
            href={`/profile/${user.name}/${ProfileTab.Collections}`}
          >
            Collections ({collectionsCount})
          </Link>
          <Link
            className={getTabClassNames(ProfileTab.Levels)}
            href={`/profile/${user.name}/${ProfileTab.Levels}`}
          >
            Levels ({levelsCount})
          </Link>
          <Link
            className={getTabClassNames(ProfileTab.ReviewsWritten)}
            href={`/profile/${user.name}/${ProfileTab.ReviewsWritten}`}
          >
            Reviews Written ({reviewsWrittenCount})
          </Link>
          <Link
            className={getTabClassNames(ProfileTab.ReviewsReceived)}
            href={`/profile/${user.name}/${ProfileTab.ReviewsReceived}`}
          >
            Reviews Received ({reviewsReceivedCount})
          </Link>
          <Link
            className={getTabClassNames(ProfileTab.Achievements)}
            href={`/profile/${user.name}/${ProfileTab.Achievements}`}
          >
            Achievements ({achievementsCount})
          </Link>
          <MultiSelectUser placeholder='Switch to another profile'
            onSelect={(user) => {
              if (user?.name) {
                router.push(`/profile/${user.name}/${profileTab}`);
              }
            }
            }
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
