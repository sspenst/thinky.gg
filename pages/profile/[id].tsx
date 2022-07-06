import { LevelModel, ReviewModel, UserModel } from '../../models/mongoose';
import React, { ButtonHTMLAttributes, DetailedHTMLProps, MouseEventHandler, useEffect, useState } from 'react';

import FormattedReview from '../../components/formattedReview';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import Review from '../../models/db/review';
import { SWRConfig } from 'swr';
import SkeletonPage from '../../components/skeletonPage';
import { Tabs } from 'flowbite-react';
import UniverseTable from '../../components/universeTable';
import User from '../../models/db/user';
import dbConnect from '../../lib/dbConnect';
import getFormattedDate from '../../helpers/getFormattedDate';
import getSWRKey from '../../helpers/getSWRKey';
import useLevelsByUserId from '../../hooks/useLevelsByUserId';
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
  const [levels, reviews_written, user] = await Promise.all([
    LevelModel.find<Level>({ isDraft: false, userId: id }, 'name slug').sort({ name: 1 }),
    ReviewModel.find<Review>({ userId: id })
      .populate('levelId', '_id name slug').sort({ ts: -1 }),
    UserModel.findById<User>(id, '-password'),
  ]);

  // Get all reviews written about a level belonging to user...
  const reviews_received = await ReviewModel.find<Review>({
    levelId: { $in: levels.map(level => level._id) },
  }).populate('levelId', '_id name slug').sort({ ts: -1 }).populate('userId', '_id name');

  if (!levels) {
    throw new Error('Error finding Levels by userId');
  }

  if (!reviews_written) {
    throw new Error('Error finding reviews written by userId');
  }

  if (!reviews_received) {
    throw new Error('Error finding reviews received by userId');
  }

  if (!user || user.isOfficial) {
    throw new Error(`Error finding User ${id}`);
  }

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
      reviews_written: JSON.parse(JSON.stringify(reviews_written)),
      reviews_received: JSON.parse(JSON.stringify(reviews_received)),
      user: JSON.parse(JSON.stringify(user)),
    } as ProfileProps,
    revalidate: 60 * 60,
  };
}

interface ProfileProps {
  levels: Level[];
  reviews_written: Review[];
  reviews_received: Review[];
  user: User | undefined;
}

export default function Profile({ levels, reviews_written, reviews_received, user }: ProfileProps) {
  const router = useRouter();
  const { id } = router.query;

  if (router.isFallback || !id) {
    return <SkeletonPage/>;
  }

  return (
    <SWRConfig value={{ fallback: {
      [getSWRKey(`/api/levels-by-user-id/${id}`)]: levels,
      [getSWRKey(`/api/reviews-by-user-id/${id}`)]: reviews_written,
      [getSWRKey(`/api/reviews-for-level-id/${id}`)]: reviews_received,
      [getSWRKey(`/api/user-by-id/${id}`)]: user,
    } }}>
      <ProfilePage/>
    </SWRConfig>
  );
}

function ProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const { levels } = useLevelsByUserId(id);
  const { reviews } = useReviewsByUserId(id);
  const { reviews_for_user_id } = useReviewsForUserId(id);
  const { user } = useUserById(id);
  const [tab, setTab] = useState('profile-tab');

  if (user === null) {
    return <span>User not found!</span>;
  } else if (!user) {
    return <span>Loading...</span>;
  }

  const changeTab = (buttonElement:any) => {
    console.log(buttonElement.target.id);
    setTab(buttonElement.target.id);
  };
  const tabActiveClass = 'inline-block p-2 text-black bg-gray-100 rounded-t-lg active dark:bg-gray-800 dark:text-blue-500';
  const tabInactiveClass = 'inline-block p-2 text-white hover:text-black rounded-t-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-black';
  // create an array of objects with the id, trigger element (eg. button), and the content element
  const tabsContent = {
    'profile-tab': (user.ts ?
      <>
        <span>{`Account created: ${getFormattedDate(user.ts)}`}</span>
        <br/>
        {user.last_visited_at && <><span>{`Last seen: ${getFormattedDate(user.last_visited_at)}`}</span><br/></> }
        <span>{`${user.name} has completed ${user.score} level${user.score !== 1 ? 's' : ''}`}</span>
        <br/>
      </>
      : null
    ),
    'levels-tab': (  !levels || levels.length === 0 ? null :
      <UniverseTable
        levels={levels}
        user={user}
      />
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
      reviews_for_user_id && reviews_for_user_id.length > 0 ?
        <h1 key='rev' className='text-lg'>
          Reviews for {`${user.name}'s levels (${reviews_for_user_id.length}):`}
        </h1> : null,

      reviews_for_user_id?.map((review, index) => {
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

  return (
    <Page title={`${user.name}'s profile`}>
      <div className='items-center'>
        <div className="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400">

          <button onClick={changeTab} id='profile-tab' aria-current="page" className={tab == 'profile-tab' ? tabActiveClass : tabInactiveClass}>Profile</button>

          <button onClick={changeTab} id='levels-tab' className={tab == 'levels-tab' ? tabActiveClass : tabInactiveClass}>Levels</button>

          <button onClick={changeTab} id='reviews-written-tab' className={tab == 'reviews-written-tab' ? tabActiveClass : tabInactiveClass}>Reviews Written ({reviews?.length || 0})</button>

          <button onClick={changeTab} id='reviews-received-tab' className={tab == 'reviews-received-tab' ? tabActiveClass : tabInactiveClass}>Reviews Received ({reviews_for_user_id?.length || 0})</button>

        </div>
        <div className="tab-content text-center">

          <div className="p-6" id="content" role="tabpanel" aria-labelledby="tabs-home-tabFill">
            {tabsContent[tab]}
          </div>

        </div>
      </div>
    </Page>
  );
}
