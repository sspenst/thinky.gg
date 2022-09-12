import classNames from 'classnames';
import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import React, { useEffect, useMemo, useState } from 'react';
import Avatar from '../../../../components/avatar';
import FollowButton from '../../../../components/followButton';
import FollowingList from '../../../../components/followingList';
import FormattedReview from '../../../../components/formattedReview';
import Page from '../../../../components/page';
import Dimensions from '../../../../constants/dimensions';
import GraphType from '../../../../constants/graphType';
import getFormattedDate from '../../../../helpers/getFormattedDate';
import { getReviewsByUserId, getReviewsByUserIdCount } from '../../../../helpers/getReviewsByUserId';
import { getReviewsForUserId, getReviewsForUserIdCount } from '../../../../helpers/getReviewsForUserId';
import cleanUser from '../../../../lib/cleanUser';
import dbConnect from '../../../../lib/dbConnect';
import { getUserFromToken } from '../../../../lib/withAuth';
import Review from '../../../../models/db/review';
import User from '../../../../models/db/user';
import { GraphModel, UserModel } from '../../../../models/mongoose';
import { getFollowData } from '../../../api/follow';
import styles from './ProfilePage.module.css';

export interface ProfileParams extends ParsedUrlQuery {
  name: string;
  tab: string[];
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  if (!context.params) {
    return { notFound: true };
  }

  // eslint-disable-next-line prefer-const
  let { name, tab } = context?.params as ProfileParams;
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token) : null;
  const page = context?.query?.page ? parseInt(context.query.page as string) : 1;

  if (!tab) {
    tab = [''];
  }

  if (tab && tab?.length > 1) {
    return {
      notFound: true,
    };
  }

  await dbConnect();

  const user = await UserModel.findOne({ name: name }, {}, { lean: true });

  if (!user) {
    return {
      notFound: true
    };
  }

  cleanUser(user);

  const userId = user._id.toString();
  const [followData, reviewsReceived, reviewsWritten, reviewsReceivedCount, reviewsWrittenCount] = await Promise.all([
    getFollowData(user._id.toString(), reqUser),
    tab[0] === 'reviews-received' ? getReviewsForUserId(userId, reqUser, { limit: 10, skip: 10 * (page - 1) }) : [] as Review[],
    tab[0] === 'reviews-written' ? getReviewsByUserId(userId, reqUser, { limit: 10, skip: 10 * (page - 1) }) : [] as Review[],
    getReviewsForUserIdCount(userId),
    getReviewsByUserIdCount(userId),
  ]);

  let reqUserFollowing: User[] = [];

  if (tab[0] === '' && reqUser?._id.toString() === userId) {
    const followingGraph = await GraphModel.find({
      source: reqUser?._id,
      type: GraphType.FOLLOW,
    }, 'target targetModel').populate('target').exec();

    reqUserFollowing = followingGraph.map((f) => f.target as User);
  }

  return {
    props: {
      followerCount: followData.followerCount,
      page: page,
      reqUser: reqUser ? JSON.parse(JSON.stringify(reqUser)) : null,
      reqUserFollowing: JSON.parse(JSON.stringify(reqUserFollowing)),
      reqUserIsFollowing: followData.isFollowing || null,
      reviewsReceived: JSON.parse(JSON.stringify(reviewsReceived)),
      reviewsReceivedCount: reviewsReceivedCount,
      reviewsWritten: JSON.parse(JSON.stringify(reviewsWritten)),
      reviewsWrittenCount: reviewsWrittenCount,
      tabSelect: tab[0] || '',
      user: JSON.parse(JSON.stringify(user)),
    } as ProfilePageProps,
  };
}

export interface ProfilePageProps {
  followerCount: number;
  page: number;
  reqUser: User | null;
  reqUserFollowing: User[];
  reqUserIsFollowing?: boolean;
  reviewsReceived?: Review[];
  reviewsReceivedCount: number;
  reviewsWritten?: Review[];
  reviewsWrittenCount: number;
  tabSelect: string;
  user: User;
}

/* istanbul ignore next */
export default function ProfilePage({
  followerCount,
  page,
  reqUser,
  reqUserFollowing,
  reqUserIsFollowing,
  reviewsReceived,
  reviewsReceivedCount,
  reviewsWritten,
  reviewsWrittenCount,
  tabSelect,
  user,
}: ProfilePageProps) {
  const urlMapReverse = useMemo(() => {
    return {
      '': 'profile-tab',
      'reviews-received': 'reviews-received-tab',
      'reviews-written': 'reviews-written-tab'
    } as { [key: string]: string };
  }, []);
  const urlMap = {
    'reviews-received-tab': 'reviews-received',
    'reviews-written-tab': 'reviews-written',
  } as { [key: string]: string };
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [tab, setTab] = useState(urlMapReverse[tabSelect || '']);
  const [numFollowers, setNumFollowers] = useState(followerCount);

  // useEffect setLoading to false on page load
  useEffect(() => {
    setLoading(false);
  }, [reviewsReceived, reviewsWritten]);

  useEffect(() => {
    setTab(urlMapReverse[tabSelect || '']);
  }, [tabSelect, urlMapReverse]);

  const changeTab = (buttonElement: React.MouseEvent<HTMLButtonElement>) => {
    if (urlMap[buttonElement.currentTarget.id]) {
      router.push(`/profile/${user.name}/${urlMap[buttonElement.currentTarget.id]}`);
    } else if (buttonElement.currentTarget.id === 'profile-tab') {
      router.push(`/profile/${user.name}`);
    }

    setTab(buttonElement.currentTarget.id);
  };

  const setPage = (page: number) => {
    setLoading(true);
    router.push(`/profile/${user.name}/${urlMap[tab]}?page=${page}`);
  };

  // create an array of objects with the id, trigger element (eg. button), and the content element
  const tabsContent = {
    'profile-tab': (user.ts ?
      <>
        <div className='flex items-center justify-center mb-4'>
          <Avatar size={Dimensions.AvatarSizeLarge} user={user} />
        </div>
        <h1 className='text-3xl font-bold'>{user.name}</h1>
        {reqUser && reqUserIsFollowing !== undefined && reqUser._id.toString() !== user._id.toString() && (
          <div className='m-4'>
            <FollowButton
              onResponse={followData => setNumFollowers(followData.followerCount)}
              reqUserIsFollowing={reqUserIsFollowing}
              user={user}
            />
          </div>
        )}
        <div className='m-4'>
          <div>{`Followers: ${numFollowers}`}</div>
          <div>{`Account created: ${getFormattedDate(user.ts)}`}</div>
          {!user.hideStatus && <>
            <div>{`Last seen: ${getFormattedDate(user.last_visited_at ? user.last_visited_at : user.ts)}`}</div>
          </>}
          <div>{`${user.name} has completed ${user.score} level${user.score !== 1 ? 's' : ''}`}</div>
        </div>
        {reqUser && reqUser._id.toString() === user._id.toString() && (<>
          <div className='font-bold text-xl mt-4 mb-2'>{`${reqUserFollowing.length} following`}</div>
          <FollowingList users={reqUserFollowing} />
        </>)}
      </>
      : null
    ),
    'reviews-written-tab': [
      <h1 key='reviews-written-tab' className='text-lg'>
        {`${user.name}'s reviews (${reviewsWrittenCount}):`}
      </h1>,
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
      <div key='pagination_btns' className='flex justify-center flex-row'>
        { (page > 1) && (
          <button className={'ml-2 ' + (loading ? 'text-gray-300 cursor-default' : 'underline')} onClick={() => setPage(page - 1) }>Previous</button>
        )}
        <div id='page-number' className='ml-2'>{page} of {Math.ceil(reviewsWrittenCount / 10)}</div>
        { reviewsWrittenCount > (page * 10) && (
          <button className={'ml-2 ' + (loading ? 'text-gray-300 cursor-default' : 'underline')} onClick={() => setPage(page + 1) }>Next</button>
        )}
      </div>,
    ],
    'reviews-received-tab': [
      <h1 key='reviews-received-tab' className='text-lg'>
          Reviews for {`${user.name}'s levels (${reviewsReceivedCount}):`}
      </h1>,
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
      <div key='pagination_btns' className='flex justify-center flex-row'>
        { (page > 1) && (
          <button className={'ml-2 ' + (loading ? 'text-gray-300 cursor-default' : 'underline')} onClick={() => setPage(page - 1) }>Previous</button>
        )}
        <div id='page-number' className='ml-2'>{page} of {Math.ceil(reviewsReceivedCount / 10)}</div>
        { reviewsReceivedCount > (page * 10) && (
          <button className={'ml-2 ' + (loading ? 'text-gray-300 cursor-default' : 'underline')} onClick={() => setPage(page + 1) }>Next</button>
        )}
      </div>,
    ],
  } as { [key: string]: React.ReactNode | null };

  function getTabClassNames(tabId: string) {
    return classNames('inline-block p-2 rounded-t-lg', tab == tabId ? styles['tab-active'] : styles.tab);
  }

  return (
    <Page title={`${user.name}'s profile`}>
      <div className='items-center'>
        <div
          className='flex flex-wrap text-sm text-center border-b'
          style={{
            borderColor: 'var(--bg-color-3)',
          }}
        >
          <button
            aria-current='page'
            className={getTabClassNames('profile-tab')}
            id='profile-tab'
            onClick={changeTab}
          >
            Profile
          </button>
          <button
            className={getTabClassNames('reviews-written-tab')}
            id='reviews-written-tab'
            onClick={changeTab}
          >
            Reviews Written ({reviewsWrittenCount})
          </button>
          <button
            className={getTabClassNames('reviews-received-tab')}
            id='reviews-received-tab'
            onClick={changeTab}
          >
            Reviews Received ({reviewsReceivedCount})
          </button>
          <Link href={`/universe/${user._id}`} passHref>
            <a className={getTabClassNames('levels-tab')}>
              Levels
            </a>
          </Link>
        </div>
        <div className='tab-content text-center'>
          <div className='p-4' id='content' role='tabpanel' aria-labelledby='tabs-home-tabFill'>
            {tabsContent[tab]}
          </div>
        </div>
      </div>
    </Page>
  );
}
