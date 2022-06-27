import React, { useCallback, useEffect, useState } from 'react';

import AddReviewModal from './addReviewModal';
import DeleteReviewModal from './deleteReviewModal';
import Link from 'next/link';
import Modal from '.';
import Review from '../../models/db/review';
import getFormattedDate from '../../helpers/getFormattedDate';
import useUser from '../../hooks/useUser';

interface ReviewDivProps {
  review: Review;
}
export function starComponent(stars:number) {
  const starsArray = [];

  for (let i = 0; i < 5; i++) {
    if (stars > i) {
      starsArray.push(<svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>);
    } else {
      starsArray.push(<svg className="w-5 h-5 text-gray-300 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>);
    }
  }

  return ( <div className='flex items-center'>{ starsArray }</div> );
}
export function ReviewDiv({ review }: ReviewDivProps) {
  return (
    <div className="block p-1 max-w-sm bg-gray rounded-lg border border-gray-200 shadow-md hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
      <Link href={`/profile/${review.userId._id}`} passHref>
        <a className='font-bold underline'>
          {review.userId.name}
        </a>

      </Link>
      { ' - '}<span className='italic'>{getFormattedDate(review.ts)}</span>
      <div className='flex items-center' style={{ justifyContent: 'center' }}>
        {review.score ? starComponent(review.score) : ''}
      </div>
      <span style={{ whiteSpace: 'pre-wrap' }}>{review.text}</span>
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
  const [isDeleteReviewOpen, setIsDeleteReviewOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>();
  const { user } = useUser();

  const getReviews = useCallback(() => {
    fetch(`/api/reviews/${levelId}`, {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setReviews(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error fetching reviews');
    });
  }, [levelId]);

  useEffect(() => {
    getReviews();
  }, [getReviews]);

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
        {reviews === undefined ? <span>Loading...</span> :
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
            getReviews();
          }}
          isOpen={isAddReviewOpen}
          levelId={levelId}
          userReview={userReview}
        />
        <DeleteReviewModal
          closeModal={() => {
            setIsDeleteReviewOpen(false);
            getReviews();
          }}
          isOpen={isDeleteReviewOpen}
          levelId={levelId}
        />
      </>
    </Modal>
  );
}
