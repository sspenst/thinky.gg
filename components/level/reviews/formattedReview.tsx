import { GameType } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import classNames from 'classnames';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React, { useContext } from 'react';
import { EnrichedLevel } from '../../../models/db/level';
import { ReviewWithStats } from '../../../models/db/review';
import User from '../../../models/db/user';
import FormattedDate from '../../formatted/formattedDate';
import FormattedLevelLink from '../../formatted/formattedLevelLink';
import FormattedUser from '../../formatted/formattedUser';
import { FolderDivider } from '../../header/directory';
import StyledTooltip from '../../page/styledTooltip';
import Solved from '../info/solved';
import ReviewDropdown from './reviewDropdown';
import { SpoilerText } from './spoilerText';

dayjs.extend(relativeTime);

interface StarProps {
  empty: boolean;
  half: boolean;
}

export function Star({ empty, half }: StarProps) {
  return (
    <svg
      className='w-5 h-5 inline text-yellow-400'
      fill='currentColor'
      style={{
        paddingLeft: 2,
        paddingRight: 2,
      }}
      viewBox='0 0 16 16'
      xmlns='http://www.w3.org/2000/svg'
    >
      {empty ?
        <path d='M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z' />
        :
        half ?
          <path d='M5.354 5.119 7.538.792A.516.516 0 0 1 8 .5c.183 0 .366.097.465.292l2.184 4.327 4.898.696A.537.537 0 0 1 16 6.32a.548.548 0 0 1-.17.445l-3.523 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256a.52.52 0 0 1-.146.05c-.342.06-.668-.254-.6-.642l.83-4.73L.173 6.765a.55.55 0 0 1-.172-.403.58.58 0 0 1 .085-.302.513.513 0 0 1 .37-.245l4.898-.696zM8 12.027a.5.5 0 0 1 .232.056l3.686 1.894-.694-3.957a.565.565 0 0 1 .162-.505l2.907-2.77-4.052-.576a.525.525 0 0 1-.393-.288L8.001 2.223 8 2.226v9.8z' />
          :
          <path d='M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z' />
      }
    </svg>
  );
}

interface StarsProps {
  stars: number;
}

export function Stars({ stars }: StarsProps) {
  const starsArray = [];

  for (let i = 0; i < 5; i++) {
    starsArray.push(
      <Star
        empty={Math.ceil(stars) <= i}
        half={Math.floor(stars) === i && stars !== Math.floor(stars)}
        key={`star-${i}`}
      />
    );
  }

  return (
    <div className='flex'>
      {starsArray}
    </div>
  );
}

interface FormattedReviewProps {
  hideBorder?: boolean;
  inModal?: boolean;
  level?: EnrichedLevel;
  onEditClick?: () => void;
  review: ReviewWithStats;
  user: User | undefined;
}

export default function FormattedReview({ hideBorder, inModal, level, onEditClick, review, user }: FormattedReviewProps) {
  const { game } = useContext(AppContext);

  return (
    <div className='flex align-center justify-center text-left break-words'>
      <div className={classNames('block w-full', { 'py-2 px-3 rounded-lg border border-color-3': !hideBorder })}>
        <div className='flex gap-x-2 items-center flex-wrap'>
          <div className='flex justify-between w-full items-center'>
            <div className='flex gap-x-2 items-center truncate'>
              <FormattedUser id={level ? `review-${level._id.toString()}` : 'review'} user={user} />
              <FormattedDate ts={review.ts} />
            </div>
            {onEditClick && user && (
              <ReviewDropdown
                inModal={inModal}
                onEditClick={onEditClick}
                userId={user._id.toString()}
              />
            )}
          </div>
          {level && <FormattedLevelLink id={`review-${user?._id?.toString() ?? 'deleted'}`} level={level} />}
        </div>
        <span className='flex items-center'>
          {review.score ? <Stars stars={review.score} /> : null}
          {review.score && review.stat ? <FolderDivider /> : null}
          {review.stat && <>
            <div
              className='flex items-center gap-2 flex-wrap'
              data-tooltip-content={review.stat.complete ?
                `Solved ${dayjs(new Date(review.stat.ts * 1000)).fromNow()}` :
                `Completed in ${review.stat.moves} steps ${dayjs(new Date(review.stat.ts * 1000)).fromNow()}`
              }
              data-tooltip-id={`review-stat-${user?._id?.toString() ?? 'deleted'}`}
            >
              <span className='font-bold' style={{
                color: !review.stat.complete && game.type === GameType.SHORTEST_PATH ? 'var(--color-incomplete)' : 'var(--color-complete)',
                textShadow: '1px 1px black',
              }}>
                {review.stat.moves}
              </span>
              {review.stat.complete && <Solved className='-mx-2' />}
            </div>
            <StyledTooltip id={`review-stat-${user?._id?.toString() ?? 'deleted'}`} />
          </>}
        </span>
        <SpoilerText id={review._id.toString()} text={review.text} />
      </div>
    </div>
  );
}
