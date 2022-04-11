import { ReviewModel, UserModel } from '../../models/mongoose';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import Link from 'next/link';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import Review from '../../models/db/review';
import User from '../../models/db/user';
import dbConnect from '../../lib/dbConnect';
import getFormattedDate from '../../helpers/getFormattedDate';

interface ReviewsParams extends ParsedUrlQuery {
  name: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { name } = context.params as ReviewsParams;
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
    } as ReviewsProps,
  };
}

interface ReviewsProps {
  reviews: Review[];
  user: User | undefined;
}

export default function Reviews({ reviews, user }: ReviewsProps) {
  if (!user) {
    return <span>User not found!</span>;
  }

  const formattedReviews = [];

  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];

    if (i !== 0) {
      formattedReviews.push(<br key={`br-${i}`}/>);
    }

    const level = review.levelId as unknown as Level;
    
    formattedReviews.push(
      <div key={i}>
        <Link href={`/level/${level._id}`} passHref>
          <a className='font-bold underline'>
            {level.name}
          </a>
        </Link>
        {review.score ? ` - ${review.score}/5` : ''}
        {' - '}
        <span className='italic' suppressHydrationWarning>{getFormattedDate(review.ts)}</span>
        <br/>
        {review.text}
      </div>
    );
  }
  
  return (
    <Page title={`${user.name}'s reviews (${reviews.length})`}>
      <>
        {formattedReviews}
      </>
    </Page>
  );
}
