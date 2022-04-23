import { LevelModel, ReviewModel, UserModel } from '../../models/mongoose';
import React, { useCallback, useEffect, useState } from 'react';
import CreatorTable from '../../components/creatorTable';
import FormattedReview from '../../components/formattedReview';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import Pack from '../../models/db/pack';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import Review from '../../models/db/review';
import { SWRConfig } from 'swr';
import User from '../../models/db/user';
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
      .populate<{packId: Pack}>('packId', '_id name userId')
      .populate<{userId: User}>('userId', '_id name'),
    ReviewModel.find<Review>({ 'userId': id })
      .populate<{levelId: Level}>('levelId', '_id name').sort({ ts: -1 }),
    UserModel.findById<User>(id, '-password'),
  ]);

  if (!user || user.isOfficial) {
    throw new Error(`Error finding User ${id}`);
  }

  levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const packs: Pack[] = [...new Set(levels.map(level => level.packId as unknown as Pack))];

  packs.sort((a: Pack, b: Pack) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const creators: User[] = [...new Set(levels.map(level => (level.officialUserId ?? level.userId) as unknown as User))];

  creators.sort((a: User, b: User) => {
    if (a.isOfficial === b.isOfficial) {
      return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
    }

    return a.isOfficial ? -1 : 1;
  });

  return {
    props: {
      creators: JSON.parse(JSON.stringify(creators)),
      levels: JSON.parse(JSON.stringify(levels)),
      packs: JSON.parse(JSON.stringify(packs)),
      reviews: JSON.parse(JSON.stringify(reviews)),
      user: JSON.parse(JSON.stringify(user)),
    } as ProfileProps,
    revalidate: 60 * 60 * 24,
  };
}

interface ProfileProps {
  creators: User[];
  levels: Level[];
  packs: Pack[];
  reviews: Review[];
  user: User | undefined;
}

export default function Profile({ creators, levels, packs, reviews, user }: ProfileProps) {
  const router = useRouter();
  const { id } = router.query;

  return (!id ? null :
    <SWRConfig value={{ fallback: {
      [getSWRKey(`/api/reviewsByUserId/${id}`)]: reviews,
      [getSWRKey(`/api/userById/${id}`)]: user,
    } }}>
      <ProfilePage
        creators={creators}
        levels={levels}
        packs={packs}
      />
    </SWRConfig>
  );
}

interface ProfilePageProps {
  creators: User[];
  levels: Level[];
  packs: Pack[];
}

function ProfilePage({ creators, levels, packs }: ProfilePageProps) {
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
        {creators.length > 0 ?
          <>
            {creators.map((creator, index) =>
              <CreatorTable
                creator={creator}
                key={index}
                levels={levels}
                packs={packs}
                user={user}
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
                level={review.levelId as unknown as Level}
                review={review}
              />
            </div>
          );
        })}
      </div>
    </Page>
  );
}
