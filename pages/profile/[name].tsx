import { ReviewModel, UserModel } from '../../models/mongoose';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import Link from 'next/link';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import Review from '../../models/db/review';
import User from '../../models/db/user';
import dbConnect from '../../lib/dbConnect';
import getFormattedDate from '../../helpers/getFormattedDate';

interface ProfileParams extends ParsedUrlQuery {
  name: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { name } = context.params as ProfileParams;
  const user = await UserModel.findOne<User>({ isOfficial: false, name: name }, '-password');

  let reviews: Review[] = [];

  if (user) {
    reviews = await ReviewModel.find<Review>({ 'userId': user._id })
      .populate<{levelId: Level}>('levelId', '_id name').sort({ ts: -1 });
  }

  return {
    props: {
      reviews: JSON.parse(JSON.stringify(reviews)),
      user: JSON.parse(JSON.stringify(user)),
    } as ProfileProps,
  };
}

interface ProfileProps {
  reviews: Review[];
  user: User | undefined;
}

export default function Profile({ reviews, user }: ProfileProps) {
  if (!user) {
    return <span>User not found!</span>;
  }

  const formattedReviews = [];

  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];

    if (i !== 0) {
      formattedReviews.push(<br/>);
    }

    const level = review.levelId as unknown as Level;
    
    formattedReviews.push(
      <div>
        <Link href={`/level/${level._id}`} passHref>
          <button className='font-bold underline'>
            {level.name}
          </button>
        </Link>
        {review.score ? ` - ${review.score}/5` : ''}
        {' - '}
        <span className='italic'>{getFormattedDate(review.ts)}</span>
        <br/>
        {review.text}
      </div>
    );
  }
  
  return (
    <>
      {user.name} has made {reviews.length} review{reviews.length !== 1 ? 's' : ''}:
      <br/>
      <br/>
      {formattedReviews}
    </>
  );
}
