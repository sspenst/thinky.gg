import Level from '../models/db/level';
import Link from 'next/link';
import React from 'react';
import Review from '../models/db/review';
import User from '../models/db/user';
import getFormattedDate from '../helpers/getFormattedDate';
import useStats from '../hooks/useStats';

interface FormattedReviewProps {
  level: Level;
  review: Review;
  user?: User;
}

export default function FormattedReview({ level, review, user }: FormattedReviewProps) {
  const { stats } = useStats();

  const stat = stats?.find(stat => stat.levelId === level._id);

  return (
    <div>
      <Link href={`/level/${level._id}`} passHref prefetch={false}>
        <a
          className='font-bold underline'
          style={{
            color: stat ? stat.complete ? 'var(--color-complete)' : 'var(--color-incomplete)' : undefined,
          }}
        >
          {level.name}
        </a>
      </Link>
      {!user ? null : <>
        {' - '}
        <Link href={`/profile/${user._id}`} passHref>
          <a className='font-bold underline'>
            {user.name}
          </a>
        </Link>
      </>}
      {review.score ? ` - ${review.score}/5` : ''}
      {' - '}
      <span className='italic' suppressHydrationWarning>{getFormattedDate(review.ts)}</span>
      <br/>
      <span style={{whiteSpace: 'pre-wrap'}}>{review.text}</span>
    </div>
  );
}
