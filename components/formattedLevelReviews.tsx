import React, { useContext, useState } from 'react';
import AddReviewModal from './modal/addReviewModal';
import DeleteReviewModal from './modal/deleteReviewModal';
import FormattedReview from './formattedReview';
import { LevelContext } from '../contexts/levelContext';
import useUser from '../hooks/useUser';

interface FormattedLevelReviewsProps {
  levelId: string;
}

export default function FormattedLevelReviews({ levelId }: FormattedLevelReviewsProps) {
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [isDeleteReviewOpen, setIsDeleteReviewOpen] = useState(false);
  const levelContext = useContext(LevelContext);
  const { user } = useUser();

  const reviewDivs = [];
  let userReview = undefined;

  if (levelContext?.reviews) {
    for (let i = 0; i < levelContext.reviews.length; i++) {
      if (i !== 0) {
        reviewDivs.push(<br key={`br-${i}`}/>);
      }

      const review = levelContext.reviews[i];

      reviewDivs.push(
        <FormattedReview
          key={`formatted-review-${i}`}
          review={review}
          user={review.userId}
        />
      );

      if (review.userId._id === user?._id) {
        userReview = review;

        reviewDivs.push(
          <div key={'review-controls'}>
            <button
              className='italic underline'
              onClick={() => setIsAddReviewOpen(true)}
              style={{
                marginRight: 10,
              }}
            >
              Edit
            </button>
            <button
              className='italic underline'
              onClick={() => setIsDeleteReviewOpen(true)}
            >
              Delete
            </button>
          </div>
        );
      }
    }
  }

  return (
    <>
      {!levelContext?.reviews ? <span>Loading...</span> :
        <>
          {user && !userReview ?
            <>
              <div>
                <button
                  className='font-bold underline'
                  onClick={() => setIsAddReviewOpen(true)}
                >
                  Add a review...
                </button>
              </div>
              <br/>
            </>
            : null }
          {reviewDivs.length > 0 ? reviewDivs : <span>No reviews yet!</span>}
        </>}
      <AddReviewModal
        closeModal={() => {
          setIsAddReviewOpen(false);
          levelContext?.getReviews();
        }}
        isOpen={isAddReviewOpen}
        levelId={levelId}
        userReview={userReview}
      />
      <DeleteReviewModal
        closeModal={() => {
          setIsDeleteReviewOpen(false);
          levelContext?.getReviews();
        }}
        isOpen={isDeleteReviewOpen}
        levelId={levelId}
      />
    </>
  );
}
