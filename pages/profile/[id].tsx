import { LevelModel, ReviewModel, UserModel } from '../../models/mongoose';
import React, { useState } from 'react';
import FormattedReview from '../../components/formattedReview';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import Link from 'next/link';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import Review from '../../models/db/review';
import { SWRConfig } from 'swr';
import SkeletonPage from '../../components/skeletonPage';
import User from '../../models/db/user';
import classNames from 'classnames';
import dbConnect from '../../lib/dbConnect';
import getFormattedDate from '../../helpers/getFormattedDate';
import getSWRKey from '../../helpers/getSWRKey';
import styles from './ProfilePage.module.css';
import useReviewsByUserId from '../../hooks/useReviewsByUserId';
import useReviewsForUserId from '../../hooks/useReviewsForUserId';
import { useRouter } from 'next/router';
import useUserById from '../../hooks/useUserById';

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

interface ProfileParams extends ParsedUrlQuery {
  id: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { id } = context.params as ProfileParams;
  const [levels, reviewsWritten, user] = await Promise.all([
    LevelModel.find<Level>({ isDraft: false, userId: id }, '_id'),
    ReviewModel.find<Review>({ userId: id })
      .populate('levelId', '_id name slug').sort({ ts: -1 }),
    UserModel.findById<User>(id, '-password'),
  ]);

  if (!levels) {
    throw new Error('Error finding Levels by userId');
  }

  if (!reviewsWritten) {
    throw new Error('Error finding reviews written by userId');
  }

  if (!user || user.isOfficial) {
    throw new Error(`Error finding User ${id}`);
  }

  // Get all reviews written about a level belonging to user...
  const reviewsReceived = await ReviewModel.find<Review>({
    levelId: { $in: levels.map(level => level._id) },
  }).populate('levelId', '_id name slug').sort({ ts: -1 }).populate('userId', '_id name');

  if (!reviewsReceived) {
    throw new Error('Error finding reviews received by userId');
  }

  return {
    props: {
      reviewsReceived: JSON.parse(JSON.stringify(reviewsReceived)),
      reviewsWritten: JSON.parse(JSON.stringify(reviewsWritten)),
      user: JSON.parse(JSON.stringify(user)),
    } as ProfileProps,
    revalidate: 60 * 60,
  };
}

interface ProfileProps {
  reviewsReceived: Review[];
  reviewsWritten: Review[];
  user: User | undefined;
}

export default function Profile({ reviewsReceived, reviewsWritten, user }: ProfileProps) {
  const router = useRouter();
  const { id } = router.query;

  if (router.isFallback || !id) {
    return <SkeletonPage/>;
  }

  return (
    <SWRConfig value={{ fallback: {
      [getSWRKey(`/api/reviews-for-user-id/${id}`)]: reviewsReceived,
      [getSWRKey(`/api/reviews-by-user-id/${id}`)]: reviewsWritten,
      [getSWRKey(`/api/user-by-id/${id}`)]: user,
    } }}>
      <ProfilePage/>
    </SWRConfig>
  );
}

function ProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const { reviews } = useReviewsByUserId(id);
  const { reviewsForUserId } = useReviewsForUserId(id);
  const [tab, setTab] = useState('profile-tab');
  const { user } = useUserById(id);

  if (user === null) {
    return <span>User not found!</span>;
  } else if (!user) {
    return <span>Loading...</span>;
  }

  const changeTab = (buttonElement: React.MouseEvent<HTMLButtonElement>) => {
    setTab(buttonElement.currentTarget.id);
  };

  // create an array of objects with the id, trigger element (eg. button), and the content element
  const tabsContent = {
    'profile-tab': (user.ts ?
      <>
        <span>{`Account created: ${getFormattedDate(user.ts)}`}</span>
        <br/>
        <span>{`Last seen: ${getFormattedDate(user.last_visited_at ? user.last_visited_at : user.ts)}`}</span>
        <br/>
        <span>{`${user.name} has completed ${user.score} level${user.score !== 1 ? 's' : ''}`}</span>
      </>
      : null
    ),
    'reviews-written-tab': [
      reviews && reviews.length > 0 ?
        <h1 key='rev' className='text-lg'>
          {`${user.name}'s reviews (${reviews.length}):`}
        </h1> : null,

      reviews?.map((review, index) => {
        return (
          <div
            key={index}
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
      })
    ],
    'reviews-received-tab': [
      reviewsForUserId && reviewsForUserId.length > 0 ?
        <h1 key='rev' className='text-lg'>
          Reviews for {`${user.name}'s levels (${reviewsForUserId.length}):`}
        </h1> : null,

      reviewsForUserId?.map((review, index) => {
        return (
          <div
            key={index}
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
      })
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
            Reviews Written ({reviews?.length || 0})
          </button>
          <button
            className={getTabClassNames('reviews-received-tab')}
            id='reviews-received-tab'
            onClick={changeTab}
          >
            Reviews Received ({reviewsForUserId?.length || 0})
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
