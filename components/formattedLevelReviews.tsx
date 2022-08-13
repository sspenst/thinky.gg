import React, { useContext } from 'react';
import { LevelContext } from '../contexts/levelContext';
import useUser from '../hooks/useUser';
import FormattedReview from './formattedReview';
import ReviewForm from './reviewForm';

export default function FormattedLevelReviews() {
  const levelContext = useContext(LevelContext);
  const { user } = useUser();

  const reviewDivs = [];
  let userReview = undefined;

  if (!levelContext || !levelContext.reviews) {
    return <span>Loading...</span>;
  }

  for (let i = 0; i < levelContext.reviews.length; i++) {
    const review = levelContext.reviews[i];

    if (review.userId._id === user?._id) {
      userReview = review;
    } else {
      reviewDivs.push(
        <FormattedReview
          key={`${review._id.toString()}`}
          review={review}
          user={review.userId}
        />
      );
    }
  }

  return (
    <>
      <ReviewForm key={userReview?._id.toString()} userReview={userReview}/>
      {reviewDivs}
      {levelContext.reviews.length === 0 && <div className='mt-4'>No reviews yet!</div>}
    </>
  );
}
