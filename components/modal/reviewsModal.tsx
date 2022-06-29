import React, { useContext, useState } from 'react';
import AddReviewModal from './addReviewModal';
import DeleteReviewModal from './deleteReviewModal';
import FormattedReview from '../formattedReview';
import { LevelContext } from '../../contexts/levelContext';
import Modal from '.';
import useUser from '../../hooks/useUser';

interface ReviewsModalProps {
  closeModal: () => void;
  isOpen: boolean;
  levelId: string;
}

export default function ReviewsModal({ closeModal, isOpen, levelId }: ReviewsModalProps) {
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [isDeleteReviewOpen, setIsDeleteReviewOpen] = useState(false);
  const levelContext = useContext(LevelContext);
  const { user } = useUser();

  const reviewDivs = [];
  let reviewsWithScore = 0;
  let totalScore = 0;
  let userReview = undefined;

  if (levelContext?.reviews) {
    for (let i = 0; i < levelContext.reviews.length; i++) {
      if (i !== 0) {
        reviewDivs.push(<br key={`br-${i}`}/>);
      }

      const review = levelContext.reviews[i];

      reviewDivs.push(
        <FormattedReview
          review={review}
          user={review.userId}
        />
      );

      if (review.score) {
        reviewsWithScore++;
        totalScore += review.score;
      }

      if (review.userId._id === user?._id) {
        userReview = review;

        reviewDivs.push(
          <div>
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

  const average = Math.round((totalScore / reviewsWithScore + Number.EPSILON) * 100) / 100;

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={reviewsWithScore ? `Reviews (${average}/5)` : 'Reviews'}
    >
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
    </Modal>
  );
}
