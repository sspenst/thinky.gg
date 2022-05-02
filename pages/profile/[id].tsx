import { LevelModel, ReviewModel, UserModel } from '../../models/mongoose';
import React, { useCallback, useEffect, useState } from 'react';
import FormattedReview from '../../components/formattedReview';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import Review from '../../models/db/review';
import { SWRConfig } from 'swr';
import UniverseTable from '../../components/universeTable';
import User from '../../models/db/user';
import World from '../../models/db/world';
import dbConnect from '../../lib/dbConnect';
import getFormattedDate from '../../helpers/getFormattedDate';
import getSWRKey from '../../helpers/getSWRKey';
import useReviewsByUserId from '../../hooks/useReviewsByUserId';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
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
  const [levels, reviews, user] = await Promise.all([
    LevelModel.find<Level>({ 'userId': id }, '_id name')
      .populate<{officialUserId: User}>('officialUserId', '_id isOfficial name')
      .populate<{userId: User}>('userId', '_id name')
      .populate<{worldId: World}>('worldId', '_id name userId')
      .sort({ name: 1 }),
    ReviewModel.find<Review>({ 'userId': id })
      .populate<{levelId: Level}>('levelId', '_id name').sort({ ts: -1 }),
    UserModel.findById<User>(id, '-password'),
  ]);

  if (!user || user.isOfficial) {
    throw new Error(`Error finding User ${id}`);
  }

  const worlds = [...new Set(levels.map(level => level.worldId))]
    .sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const universes = [...new Set(levels.map(level => level.officialUserId ?? level.userId))]
    .sort((a, b) => {
      if (a.isOfficial === b.isOfficial) {
        return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
      }

      return a.isOfficial ? -1 : 1;
    });

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
      reviews: JSON.parse(JSON.stringify(reviews)),
      universes: JSON.parse(JSON.stringify(universes)),
      user: JSON.parse(JSON.stringify(user)),
      worlds: JSON.parse(JSON.stringify(worlds)),
    } as ProfileProps,
    revalidate: 60 * 60 * 24,
  };
}

interface ProfileProps {
  levels: Level[];
  reviews: Review[];
  universes: User[];
  user: User | undefined;
  worlds: World[];
}

export default function Profile({ levels, reviews, universes, user, worlds }: ProfileProps) {
  const router = useRouter();
  const { id } = router.query;

  return (!id ? null :
    <SWRConfig value={{ fallback: {
      [getSWRKey(`/api/reviews-by-user-id/${id}`)]: reviews,
      [getSWRKey(`/api/user-by-id/${id}`)]: user,
    } }}>
      <ProfilePage
        levels={levels}
        universes={universes}
        worlds={worlds}
      />
    </SWRConfig>
  );
}

interface ProfilePageProps {
  levels: Level[];
  universes: User[];
  worlds: World[];
}

function ProfilePage({ levels, universes, worlds }: ProfilePageProps) {
  const collapsedReviewLimit = 5;
  const [collapsedReviews, setCollapsedReviews] = useState(true);
  const router = useRouter();
  const { id } = router.query;
  const { reviews } = useReviewsByUserId(id);
  const { stats } = useStats();
  const { user } = useUserById(id);

  useEffect(() => {
    if (reviews && reviews.length <= collapsedReviewLimit) {
      setCollapsedReviews(false);
    }
  }, [reviews]);

  const getCompletedLevels = useCallback(() => {
    if (!stats) {
      return 0;
    }

    let complete = 0;

    for (let i = 0; i < levels.length; i++) {
      const stat = stats.find(stat => stat.levelId === levels[i]._id);

      if (stat && stat.complete) {
        complete += 1;
      }
    }

    return complete;
  }, [levels, stats]);
  
  if (user === null) {
    return <span>User not found!</span>;
  } else if (!user) {
    return <span>Loading...</span>;
  }

  return (
    <Page title={`${user.name}'s profile`}>
      <div
        style={{
          padding: 10,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            margin: '0 0 20px 0',
          }}
        >
          {user.ts ?
            <>
              <span>{`Account created: ${getFormattedDate(user.ts, false)}`}</span>
              <br/>
            </>
            : null
          }
          <span>{`${user.name} has completed ${user.score} level${user.score !== 1 ? 's' : ''}`}</span>
          {levels.length > 0 ?
            <>
              <br/>
              <span>{`${user.name} has created ${levels.length} level${levels.length !== 1 ? 's' : ''}`}</span>
              <br/>
              <span>{`You have completed ${getCompletedLevels()} of ${user.name}'s level${getCompletedLevels() !== 1 ? 's' : ''}`}</span>
            </>
            : null
          }
        </div>
        {universes.length > 0 ?
          <>
            {universes.map((universe, index) =>
              <UniverseTable
                key={index}
                levels={levels}
                universe={universe}
                user={user}
                worlds={worlds}
              />
            )}
          </> : null
        }
        <div
          style={{
            margin: 20,
          }}
        >
          {reviews && reviews.length > 0 ?
            <div className='text-lg'>
              <>
                {`${user.name}'s reviews (`}
                {collapsedReviews ?
                  <button
                    className='font-bold underline'
                    onClick={() => setCollapsedReviews(false)}
                  >
                    show all
                  </button>
                  :
                  reviews.length
                }
                {'):'}
              </>
            </div>
            : null
          }
        </div>
        {reviews?.map((review, index) => {
          if (collapsedReviews && index >= collapsedReviewLimit) {
            return null;
          }

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
        })}
      </div>
    </Page>
  );
}
