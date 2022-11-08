import classNames from 'classnames';
import { debounce } from 'debounce';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { ParsedUrlQuery, stringify } from 'querystring';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import Avatar from '../../../../components/avatar';
import FollowButton from '../../../../components/followButton';
import FollowingList from '../../../../components/followingList';
import FormattedReview from '../../../../components/formattedReview';
import Page from '../../../../components/page';
import Select from '../../../../components/select';
import SelectFilter from '../../../../components/selectFilter';
import Dimensions from '../../../../constants/dimensions';
import GraphType from '../../../../constants/graphType';
import TimeRange from '../../../../constants/timeRange';
import { AppContext } from '../../../../contexts/appContext';
import { enrichCollection } from '../../../../helpers/enrich';
import filterSelectOptions, { FilterSelectOption } from '../../../../helpers/filterSelectOptions';
import getFormattedDate from '../../../../helpers/getFormattedDate';
import getProfileSlug from '../../../../helpers/getProfileSlug';
import { getReviewsByUserId, getReviewsByUserIdCount } from '../../../../helpers/getReviewsByUserId';
import { getReviewsForUserId, getReviewsForUserIdCount } from '../../../../helpers/getReviewsForUserId';
import naturalSort from '../../../../helpers/naturalSort';
import cleanUser from '../../../../lib/cleanUser';
import dbConnect from '../../../../lib/dbConnect';
import { getUserFromToken } from '../../../../lib/withAuth';
import Collection, { EnrichedCollection } from '../../../../models/db/collection';
import { EnrichedLevel } from '../../../../models/db/level';
import Review from '../../../../models/db/review';
import User from '../../../../models/db/user';
import { CollectionModel, GraphModel, LevelModel, StatModel, UserModel } from '../../../../models/mongoose';
import SelectOption from '../../../../models/selectOption';
import SelectOptionStats from '../../../../models/selectOptionStats';
import { getFollowData } from '../../../api/follow';
import { doQuery } from '../../../api/search';
import { SearchQuery } from '../../../search';
import styles from './ProfilePage.module.css';
import Stat from '../../../../models/db/stat';
import { getDifficultyList, getDifficultyFromValue } from '../../../../components/difficultyDisplay';


export const enum ProfileTab {
  Collections = 'collections',
  Profile = '',
  Levels = 'levels',
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

  await dbConnect();

  const user = await UserModel.findOne({ name: name }, '+bio -roles', { lean: true });

  if (!user) {
    return {
      notFound: true
    };
  }

  cleanUser(user);

  const userId = user._id.toString();
  const [
    collectionsCount,
    followData,
    levelsCount,
    reviewsReceived,
    reviewsWritten,
    reviewsReceivedCount,
    reviewsWrittenCount
  ] = await Promise.all([
    CollectionModel.countDocuments({ userId: userId }),
    getFollowData(user._id.toString(), reqUser),
    LevelModel.countDocuments({ isDraft: false, userId: userId }),
    profileTab === ProfileTab.ReviewsReceived ? getReviewsForUserId(userId, reqUser, { limit: 10, skip: 10 * (page - 1) }) : [] as Review[],
    profileTab === ProfileTab.ReviewsWritten ? getReviewsByUserId(userId, reqUser, { limit: 10, skip: 10 * (page - 1) }) : [] as Review[],
    getReviewsForUserIdCount(userId),
    getReviewsByUserIdCount(userId),
  ]);

  const profilePageProps = {
    collectionsCount: collectionsCount,
    followerCountInit: followData.followerCount,
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

  if (profileTab === ProfileTab.Profile && reqUser && reqUser._id.toString() === userId) {
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

    const query = await doQuery(searchQuery, reqUser?._id.toString());

    if (!query) {
      throw new Error('Error finding Levels');
    }

    profilePageProps.enrichedLevels = JSON.parse(JSON.stringify(query.levels));
    profilePageProps.searchQuery = searchQuery;
    profilePageProps.totalRows = query.totalRows;
  }

  if (profileTab === ProfileTab.Profile) {
    const levelsCompletedByDifficultyData = await StatModel.aggregate([
      {
        $match: {
          $and: [ {userId: user._id }, { complete: true}],
        },
      },
      {
        $lookup: {
          from: 'levels',
          localField: 'levelId',
          foreignField: '_id',
          as: 'levelInfo',
        },
      },
      {
        $unwind:"$levelInfo"
      },
      {
        $project: {
          difficulty: "$levelInfo.calc_difficulty_estimate"
        }
      }
    ]);

    let levelsCompletedByDifficulty:Record<string,number> = {"Pending":0};
    const difficultyList = getDifficultyList();

    for (let i = 0; i < difficultyList.length; i++) {
      levelsCompletedByDifficulty[difficultyList[i].name] = 0;
    }

    for (let i = 0; i < levelsCompletedByDifficultyData.length; i++) {
      const difficultyLookup = getDifficultyFromValue(levelsCompletedByDifficultyData[i].difficulty)
      
      levelsCompletedByDifficulty[difficultyLookup.name] = levelsCompletedByDifficulty[difficultyLookup.name] + 1;
    }

      profilePageProps.levelsCompletedByDifficulty = levelsCompletedByDifficulty;
    } 
  return {
    props: profilePageProps,
  };
}

export interface ProfilePageProps {
  collectionsCount: number;
  enrichedCollections: EnrichedCollection[] | undefined;
  enrichedLevels: EnrichedLevel[] | undefined;
  followerCountInit: number;
  levelsCompletedByDifficulty?: Record<string,number>;
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
  const [page, setPage] = useState(pageProp);
  const router = useRouter();
  const [searchLevelText, setSearchLevelText] = useState('');
  const { setIsLoading } = useContext(AppContext);
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
    }).filter(option => option.stats?.total);
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
      setIsLoading(true);

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

    setIsLoading(true);

    router.push({
      pathname: `/profile/${user.name}/${tab}`,
      query: {
        page: 1,
        search: searchLevelText,
        show_filter: showLevelFilter === value ? FilterSelectOption.All : value,
      },
    });
  };

  // create an array of objects with the id, trigger element (eg. button), and the content element
  const tabsContent = {
    [ProfileTab.Profile]: (user.ts ?
      <>
        <div className='flex items-center justify-center mb-4'>
          <Avatar size={Dimensions.AvatarSizeLarge} user={user} />
        </div>
        <h2 className='text-3xl font-bold'>{user.name}</h2>
        <p className='italic text-sm break-words mt-2'>{user.bio || 'No bio'}</p>
        {reqUser && reqUserIsFollowing !== undefined && reqUser._id.toString() !== user._id.toString() && (
          <div className='m-4'>
            <FollowButton
              isFollowingInit={reqUserIsFollowing}
              onResponse={followData => setFollowerCount(followData.followerCount)}
              user={user}
            />
          </div>
        )}
        <div className='flex justify-center'>
          <div className='m-4 text-left'>
            <h2><span className='font-bold'>Followers:</span> {followerCount}</h2>
            <h2> <span className='font-bold'>Account created:</span> {getFormattedDate(user.ts)}</h2>
            {!user.hideStatus && <>
              <h2><span className='font-bold'>Last seen:</span> {getFormattedDate(user.last_visited_at ? user.last_visited_at : user.ts)}</h2>
            </>}
            <h2><span className='font-bold'>Levels Completed:</span> {user.score}</h2>
          </div>
        </div>

        {reqUser && reqUser._id.toString() === user._id.toString() && reqUserFollowing && (<>
          <div className='font-bold text-xl mt-4 mb-2'>{`${reqUserFollowing.length} following`}</div>
          <FollowingList users={reqUserFollowing} />
        </>)}
        {levelsCompletedByDifficulty && (<>
          <div key="levelCompletedByRankTable" className="test">
            <h1 className='flex justify-center text-lg font-bold'>Levels Completed By Rank</h1>
            <table style={{
              margin: `${Dimensions.TableMargin}px auto`,
              // width: tableWidth,
            }}>
              <tbody>
              <tr key={'statistics-header'} style={{ backgroundColor: 'var(--bg-color-2)' }}>
                <th style={{ height: Dimensions.TableRowHeight, width: 50 }}>
                  Difficulty
                </th>
                <th key={`header-column-levels-completed-by-rank`}>
                  Level Completed By Rank
                </th>
              </tr>
                {Object.entries(levelsCompletedByDifficulty).map(entry => {
                  const [rank, levelCount] = entry
                  return (
                    <tr key={`${rank}-test`}>
                    <td style={{ height: Dimensions.TableRowHeight }}>
                      {rank}
                    </td>
                    <td key={`levelCount-column-count`}>
                      {levelCount}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>)}
      </>
      :
      <>
        {user.name} has not yet registered on Pathology.
      </>
    ),
    [ProfileTab.Collections]: getCollectionOptions().length === 0 ?
      <>
        No collections!
      </>
      :
      <>
        <SelectFilter
          filter={showCollectionFilter}
          onFilterClick={onFilterCollectionClick}
          placeholder={`Search ${getFilteredCollectionOptions().length} collection${getFilteredCollectionOptions().length !== 1 ? 's' : ''}...`}
          searchText={collectionFilterText}
          setSearchText={setCollectionFilterText}
        />
        <div>
          <Select options={getFilteredCollectionOptions()} />
        </div>
      </>,
    [ProfileTab.Levels]: (<>
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
      <div className='flex justify-center pt-2'>
        <Link
          className='underline'
          href={'/search?time_range=All&searchAuthor=' + user.name}
        >
          Advanced search
        </Link>
      </div>
      <div>
        <Select options={getLevelOptions()} />
      </div>
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
    </>),
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
  } as { [key: string]: React.ReactNode | null };

  const getTabClassNames = useCallback((tabId: ProfileTab) => {
    return classNames(
      'inline-block p-2 rounded-lg',
      tab == tabId ? [styles['tab-active'], 'font-bold'] : styles.tab,
    );
  }, [tab]);

  return (
    <Page title={user.name}>
      <>
        <NextSeo
          title={`${user.name} - Pathology`}
          description={`${user.name}'s profile`}
          canonical={'https://pathology.gg' + getProfileSlug(user)}
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
        <div className='flex flex-wrap text-sm text-center gap-2 mt-2 justify-center'>
          <Link
            className={getTabClassNames(ProfileTab.Profile)}
            href={`/profile/${user.name}`}
          >
            Profile
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
        </div>
        <div className='tab-content text-center'>
          <div className='p-4' id='content' role='tabpanel' aria-labelledby='tabs-home-tabFill'>
            {tabsContent[tab]}
          </div>
        </div>
      </>
    </Page>
  );
}
