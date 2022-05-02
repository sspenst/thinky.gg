import React, { useCallback, useEffect, useState } from 'react';
import AddReviewModal from './addReviewModal';
import Link from 'next/link';
import Modal from '.';
import Review from '../../models/db/review';
import getFormattedDate from '../../helpers/getFormattedDate';
import useUser from '../../hooks/useUser';

interface ReviewDivProps {
  review: Review;
}

function ReviewDiv({ review }: ReviewDivProps) {
  return (
    <div>
      <Link href={`/profile/${review.userId._id}`} passHref>
        <a className='font-bold underline'>
          {review.userId.name}
        </a>
      </Link>
      {review.score ? ` - ${review.score}/5` : ''}
      {' - '}
      <span className='italic'>{getFormattedDate(review.ts)}</span>
      <br/>
      <span style={{whiteSpace: 'pre-wrap'}}>{review.text}</span>
    </div>
  );
}

interface ReviewsModalProps {
  closeModal: () => void;
  isOpen: boolean;
  levelId: string;
}

export default function ReviewsModal({ closeModal, isOpen, levelId }: ReviewsModalProps) {
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>();
  const { user } = useUser();

  const getReviews = useCallback(() => {
    fetch(`/api/reviews/${levelId}`, {
      method: 'GET',
    })
    .then(async res => {
      if (res.status === 200) {
        setReviews(await res.json());
      } else {
        throw res.text();
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error fetching reviews');
    });
  }, [levelId]);

  useEffect(() => {
    getReviews();
  }, [getReviews]);

  function deleteReview() {
    fetch(`/api/review/${levelId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    .then(res => {
      if (res.status === 200) {
        getReviews();
      } else {
        throw res.text();
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error adding review');
    });
  }

  const reviewDivs = [];
  let reviewsWithScore = 0;
  let totalScore = 0;
  let userReview = undefined;

  if (reviews) {
    for (let i = 0; i < reviews.length; i++) {
      if (i !== 0) {
        reviewDivs.push(<br key={`br-${i}`}/>);
      }

      const review = reviews[i];

      reviewDivs.push(<ReviewDiv key={i} review={review} />);

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
              onClick={deleteReview}
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
        {reviews === undefined ? <span>Loading...</span> :
        <>
          {user && !userReview ? <>
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
            getReviews();
          }}
          isOpen={isAddReviewOpen}
          levelId={levelId}
          userReview={userReview}
        />
      </>
    </Modal>
  );
}
