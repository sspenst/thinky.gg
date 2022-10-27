import React, { useContext } from 'react';
import { AppContext } from '../contexts/appContext';
import { LevelContext } from '../contexts/levelContext';
import FormattedReview from './formattedReview';
import ReviewForm from './reviewForm';

interface FormattedLevelReviewsProps {
  inModal?: boolean;
}

export default function FormattedLevelReviews({ inModal }: FormattedLevelReviewsProps) {
  const levelContext = useContext(LevelContext);
  const { user } = useContext(AppContext);

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
          key={`review-${review._id.toString()}`}
          review={review}
          user={review.userId}
        />
      );
    }
  }

  return (
    <>
      <ReviewForm inModal={inModal} key={`user-review-${userReview?._id.toString()}`} userReview={userReview} />
      {reviewDivs}
      {levelContext.reviews.length === 0 && <div className='mt-4'>No reviews yet!</div>}
    </>
  );
}
