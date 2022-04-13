import { LevelModel, ReviewModel, UserModel } from '../../models/mongoose';
import React, { useState } from 'react';
import CreatorTable from '../../components/creatorTable';
import FormattedReview from '../../components/formattedReview';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import Pack from '../../models/db/pack';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import Review from '../../models/db/review';
import User from '../../models/db/user';
import dbConnect from '../../lib/dbConnect';

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

interface ProfileParams extends ParsedUrlQuery {
  name: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { name } = context.params as ProfileParams;
  const user = await UserModel.findOne<User>({ isOfficial: false, name: name }, '-password');

  let levels: Level[] = [];
  let reviews: Review[] = [];

  if (user) {
    [levels, reviews] = await Promise.all([
      LevelModel.find<Level>({ 'userId': user._id }, '_id name')
        .populate<{officialUserId: User}>('officialUserId', '_id isOfficial name')
        .populate<{packId: Pack}>('packId', '_id name userId')
        .populate<{userId: User}>('userId', '_id name'),
      ReviewModel.find<Review>({ 'userId': user._id })
        .populate<{levelId: Level}>('levelId', '_id name').sort({ ts: -1 }),
    ]);

    levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);
  }

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
  const collapsedReviewLimit = 5;
  const [collapsedReviews, setCollapsedReviews] = useState(reviews ? reviews.length > collapsedReviewLimit : true);

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
          </> :
          <div>{user.name} has not created any levels</div>
        }
        <div
          style={{
            margin: 20,
          }}
        >
          {reviews.length > 0 ?
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
            :
            <div>{user.name} has not written any reviews</div>
          }
        </div>
        {reviews.map((review, index) => {
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
