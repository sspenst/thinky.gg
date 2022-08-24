import classNames from 'classnames';
import React from 'react';
import getFormattedDate from '../helpers/getFormattedDate';
import Review from '../models/db/review';
import User from '../models/db/user';
import { EnrichedLevel } from '../pages/search';
import EnrichedLevelLink from './enrichedLevelLink';
import FormattedUser from './formattedUser';

interface StarProps {
  empty: boolean;
}

export function Star({ empty }: StarProps) {
  return (
    <svg
      className={classNames('w-5 h-5 star-svg', { 'text-yellow-400': !empty })}
      fill='currentColor'
      style={{
        color: empty ? 'var(--bg-color-4)' : undefined,
      }}
      viewBox='0 0 20 20'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'></path>
    </svg>
  );
}

function Stars(stars: number) {
  const starsArray = [];

  for (let i = 0; i < 5; i++) {
    starsArray.push(
      <Star empty={stars <= i} key={`star-${i}`} />
    );
  }

  return (
    <div className='flex'>
      {starsArray}
    </div>
  );
}

interface FormattedReviewProps {
  level?: EnrichedLevel;
  onDeleteClick?: () => void;
  onEditClick?: () => void;
  review: Review;
  user?: User;
}

export default function FormattedReview({ level, onDeleteClick, onEditClick, review, user }: FormattedReviewProps) {
  return (
    <div className='flex align-center justify-center text-left break-words mt-4'>
      <div
        className='block py-2 px-3 rounded-lg border'
        style={{
          borderColor: 'var(--bg-color-4)',
          maxWidth: 450,
          width: '100%',
        }}
      >
        <div>
          {user && <FormattedUser user={user} />}
          {!level ? null :
            <>
              <EnrichedLevelLink level={level} />
              {' - '}
            </>
          }
          <span className='italic' suppressHydrationWarning>{getFormattedDate(review.ts)}</span>
        </div>
        {review.score ? Stars(review.score) : null}
        <span style={{ whiteSpace: 'pre-wrap' }}>{review.text}</span>
        {(onEditClick || onDeleteClick) && <div className='mt-1'>
          {onEditClick && <button
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold p-2 mr-2 rounded-lg text-sm focus:bg-blue-800 disabled:opacity-25'
            onClick={onEditClick}>
            Edit
          </button>}
          {onDeleteClick && <button
            className='bg-red-500 hover:bg-red-700 text-white font-bold p-2 rounded-lg text-sm focus:bg-red-800 disabled:opacity-25'
            onClick={onDeleteClick}>
            Delete
          </button>}
        </div>}
      </div>
    </div>
  );
}
