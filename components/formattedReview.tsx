import classNames from 'classnames';
import React from 'react';
import getFormattedDate from '../helpers/getFormattedDate';
import { EnrichedLevel } from '../models/db/level';
import Review from '../models/db/review';
import User from '../models/db/user';
import EnrichedLevelLink from './enrichedLevelLink';
import FormattedUser from './formattedUser';

interface StarProps {
  half: boolean;
  empty: boolean;
}

export function Star({ half, empty }: StarProps) {
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
      {!half ? (
        <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z" />
      ) : (
        <path d="M5.354 5.119 7.538.792A.516.516 0 0 1 8 .5c.183 0 .366.097.465.292l2.184 4.327 4.898.696A.537.537 0 0 1 16 6.32a.548.548 0 0 1-.17.445l-3.523 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256a.52.52 0 0 1-.146.05c-.342.06-.668-.254-.6-.642l.83-4.73L.173 6.765a.55.55 0 0 1-.172-.403.58.58 0 0 1 .085-.302.513.513 0 0 1 .37-.245l4.898-.696zM8 12.027a.5.5 0 0 1 .232.056l3.686 1.894-.694-3.957a.565.565 0 0 1 .162-.505l2.907-2.77-4.052-.576a.525.525 0 0 1-.393-.288L8.001 2.223 8 2.226v9.8z" />
      )}
    </svg>
  );
}

function Stars(stars: number) {
  const starsArray = [];

  for (let i = 0; i < 5; i++) {
    starsArray.push(
      <Star half={Math.floor(stars) === i && stars !== Math.floor(stars)} empty={Math.ceil(stars) <= i} key={`star-${i}`} />
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
