import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Modal from '.';
import Review from '../../models/db/review';
import User from '../../models/db/user';
import getFormattedDate from '../../helpers/getFormattedDate';

interface ReviewDivProps {
  review: Review;
}

function ReviewDiv({ review }: ReviewDivProps) {
  // NB: casting populated field
  const user = review.userId as unknown as User;

  return (
    <div>
      <Link href={`/profile/${user.name}`} passHref>
        <a className='font-bold underline'>
          {user.name}
        </a>
      </Link>
      {review.score ? ` - ${review.score}/5` : ''}
      {' - '}
      <span className='italic'>{getFormattedDate(review.ts)}</span>
      <br/>
      {review.text}
    </div>
  );
}

interface ReviewsModalProps {
  closeModal: () => void;
  isOpen: boolean;
  levelId: string | undefined;
}

export default function ReviewsModal({ closeModal, isOpen, levelId }: ReviewsModalProps) {
  const [reviews, setReviews] = useState<Review[]>();

  useEffect(() => {
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

  const reviewDivs = [];
  let reviewsWithScore = 0;
  let totalScore = 0;

  if (reviews) {
    for (let i = 0; i < reviews.length; i++) {
      if (i !== 0) {
        reviewDivs.push(<br key={`br-${i}`}/>);
      }

      reviewDivs.push(<ReviewDiv key={i} review={reviews[i]} />);

      if (reviews[i].score) {
        reviewsWithScore++;
        totalScore += reviews[i].score;
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
        {reviews === undefined ? <span>Loading...</span> : reviewsWithScore ? reviewDivs : <span>No reviews yet!</span>}
      </>
    </Modal>
  );
}
