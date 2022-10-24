import classNames from 'classnames';
import { debounce } from 'debounce';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
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
import { CollectionModel, GraphModel, LevelModel, UserModel } from '../../../../models/mongoose';
import SelectOption from '../../../../models/selectOption';
import SelectOptionStats from '../../../../models/selectOptionStats';
import { getFollowData } from '../../../api/follow';
import { doQuery } from '../../../api/search';
import { SearchQuery } from '../../../search';
import styles from './ProfilePage.module.css';

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

  const user = await UserModel.findOne({ name: name }, {}, { lean: true });

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
    }, 'target targetModel').populate('target').exec();

    /* istanbul ignore next */
    const reqUserFollowing = followingGraph.map((f) => f.target as User)
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

  return {
    props: profilePageProps,
  };
}

export interface ProfilePageProps {
  collectionsCount: number;
  enrichedCollections: EnrichedCollection[] | undefined;
  enrichedLevels: EnrichedLevel[] | undefined;
  followerCountInit: number;
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
        <h1 className='text-3xl font-bold'>{user.name}</h1>
        {reqUser && reqUserIsFollowing !== undefined && reqUser._id.toString() !== user._id.toString() && (
          <div className='m-4'>
            <FollowButton
              isFollowingInit={reqUserIsFollowing}
              onResponse={followData => setFollowerCount(followData.followerCount)}
              user={user}
            />
          </div>
        )}
        <div className='m-4'>
          <div>{`Followers: ${followerCount}`}</div>
          <div>{`Account created: ${getFormattedDate(user.ts)}`}</div>
          {!user.hideStatus && <>
            <div>{`Last seen: ${getFormattedDate(user.last_visited_at ? user.last_visited_at : user.ts)}`}</div>
          </>}
          <div>{`${user.name} has completed ${user.score} level${user.score !== 1 ? 's' : ''}`}</div>
        </div>
        {reqUser && reqUser._id.toString() === user._id.toString() && reqUserFollowing && (<>
          <div className='font-bold text-xl mt-4 mb-2'>{`${reqUserFollowing.length} following`}</div>
          <FollowingList users={reqUserFollowing} />
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
        <Link href={'/search?time_range=All&searchAuthor=' + user.name}><a className='underline'>Advanced search</a></Link>
      </div>
      <div>
        <Select options={getLevelOptions()} />
      </div>
      {totalRows !== undefined && totalRows > 20 &&
        <div className='flex justify-center flex-row'>
          {page > 1 && (
            <Link href={`/profile/${user.name}/${ProfileTab.Levels}?page=${page - 1}&search=${searchLevelText}&show_filter=${showLevelFilter}`}>
              <a className='ml-2 underline'>
                Previous
              </a>
            </Link>
          )}
          <div id='page-number' className='ml-2'>{page} of {Math.ceil(totalRows / 20)}</div>
          {totalRows > (page * 20) && (
            <Link href={`/profile/${user.name}/${ProfileTab.Levels}?page=${page + 1}&search=${searchLevelText}&show_filter=${showLevelFilter}`}>
              <a className='ml-2 underline'>
                Next
              </a>
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
            <Link href={`/profile/${user.name}/${ProfileTab.ReviewsWritten}${page !== 2 ? `?page=${page - 1}` : ''}`}>
              <a className='ml-2 underline'>
                Previous
              </a>
            </Link>
          )}
          <div id='page-number' className='ml-2'>{page} of {Math.ceil(reviewsWrittenCount / 10)}</div>
          {reviewsWrittenCount > (page * 10) && (
            <Link href={`/profile/${user.name}/${ProfileTab.ReviewsWritten}?page=${page + 1}`}>
              <a className='ml-2 underline'>
                Next
              </a>
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
            <Link href={`/profile/${user.name}/${ProfileTab.ReviewsReceived}${page !== 2 ? `?page=${page - 1}` : ''}`}>
              <a className='ml-2 underline'>
                Previous
              </a>
            </Link>
          )}
          <div id='page-number' className='ml-2'>{page} of {Math.ceil(reviewsReceivedCount / 10)}</div>
          {reviewsReceivedCount > (page * 10) && (
            <Link href={`/profile/${user.name}/${ProfileTab.ReviewsReceived}?page=${page + 1}`}>
              <a className='ml-2 underline'>
                Next
              </a>
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
        <div className='flex flex-wrap text-sm text-center gap-2 mt-2 justify-center'>
          <Link href={`/profile/${user.name}`}>
            <a className={getTabClassNames(ProfileTab.Profile)}>
              Profile
            </a>
          </Link>
          <Link href={`/profile/${user.name}/${ProfileTab.Collections}`}>
            <a className={getTabClassNames(ProfileTab.Collections)}>
              Collections ({collectionsCount})
            </a>
          </Link>
          <Link href={`/profile/${user.name}/${ProfileTab.Levels}`}>
            <a className={getTabClassNames(ProfileTab.Levels)}>
              Levels ({levelsCount})
            </a>
          </Link>
          <Link href={`/profile/${user.name}/${ProfileTab.ReviewsWritten}`}>
            <a className={getTabClassNames(ProfileTab.ReviewsWritten)}>
              Reviews Written ({reviewsWrittenCount})
            </a>
          </Link>
          <Link href={`/profile/${user.name}/${ProfileTab.ReviewsReceived}`}>
            <a className={getTabClassNames(ProfileTab.ReviewsReceived)}>
              Reviews Received ({reviewsReceivedCount})
            </a>
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
