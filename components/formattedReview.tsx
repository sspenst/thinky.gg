import Level from '../models/db/level';
import Link from 'next/link';
import React from 'react';
import Review from '../models/db/review';
import User from '../models/db/user';
import classNames from 'classnames';
import getFormattedDate from '../helpers/getFormattedDate';
import useStats from '../hooks/useStats';

export function Stars(stars: number) {
  const starsArray = [];

  for (let i = 0; i < 5; i++) {
    starsArray.push(
      <svg
        className={classNames('w-5 h-5', stars > i ? 'text-yellow-400' : undefined)}
        fill='currentColor'
        style={{
          color: stars <= i ? 'var(--bg-color-4)' : undefined,
        }}
        viewBox='0 0 20 20'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'></path>
      </svg>
    );
  }

  return (
    <div className='flex items-center justify-center'>
      {starsArray}
    </div>
  );
}

interface FormattedReviewProps {
  level?: Level;
  review: Review;
  user?: User;
}

export default function FormattedReview({ level, review, user }: FormattedReviewProps) {
  const { stats } = useStats();

  const stat = level && stats?.find(stat => stat.levelId === level._id);

  return (
    <div className='flex align-center justify-center text-center'>
      <div
        className='block py-2 px-3 max-w-md rounded-lg border'
        style={{
          borderColor: 'var(--bg-color-4)',
        }}
      >
        <div>
          {!level ? null :
            <>
              <Link href={`/level/${level.slug}`} passHref prefetch={false}>
                <a
                  className='font-bold underline'
                  style={{
                    color: stat ? stat.complete ? 'var(--color-complete)' : 'var(--color-incomplete)' : undefined,
                  }}
                >
                  {level.name}
                </a>
              </Link>
              {' - '}
            </>
          }
          {!user ? null : <>
            <Link href={`/profile/${user._id}`} passHref>
              <a className='font-bold underline'>
                {user.name}
              </a>
            </Link>
            {' - '}
          </>}
          <span className='italic' suppressHydrationWarning>{getFormattedDate(review.ts)}</span>
        </div>
        {review.score ? Stars(review.score) : null}
        <span style={{ whiteSpace: 'pre-wrap' }}>{review.text}</span>
      </div>
    </div>
  );
}
