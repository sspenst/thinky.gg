import StyledTooltip from '@root/components/page/styledTooltip';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { Rating } from 'react-simple-star-rating';
import ReactTextareaAutosize from 'react-textarea-autosize';
import { AppContext } from '../../../contexts/appContext';
import { LevelContext } from '../../../contexts/levelContext';
import { PageContext } from '../../../contexts/pageContext';
import { ReviewWithStats } from '../../../models/db/review';
import ProfileAvatar from '../../profile/profileAvatar';
import isNotFullAccountToast from '../../toasts/isNotFullAccountToast';
import FormattedReview, { Star } from './formattedReview';

interface ReviewFormProps {
  inModal?: boolean;
  review?: ReviewWithStats;
}

export default function ReviewForm({ inModal, review }: ReviewFormProps) {
  const [isEditing, setIsEditing] = useState(!review);
  const [isUpdating, setIsUpdating] = useState(false);
  const levelContext = useContext(LevelContext);
  const [rating, setRating] = useState(review?.score || 0);
  const [reviewBody, setReviewBody] = useState(review?.text || '');
  const { setPreventKeyDownEvent } = useContext(PageContext);
  const { user: reqUser } = useContext(AppContext);

  function onUpdateReview() {
    setIsUpdating(true);

    toast.dismiss();
    toast.loading('Saving...');

    fetch('/api/review/' + levelContext?.level._id, {
      method: review ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        score: rating,
        text: reviewBody,
        userId: review?.userId._id.toString(),
      }),
    }).then(res => {
      if (res.status === 401) {
        isNotFullAccountToast('Reviewing');
      } else if (res.status !== 200) {
        throw res.text();
      } else {
        toast.dismiss();
        toast.success('Saved');

        levelContext?.mutateReviews();
        setIsEditing(false);
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Error saving review');
    }).finally(() => {
      setIsUpdating(false);
    });
  }

  const user = review?.userId ?? reqUser;

  if (!user) {
    return null;
  }

  if (!isEditing && review) {
    return (
      <>
        <FormattedReview
          hideBorder={true}
          inModal={inModal}
          key={'user-formatted-review'}
          onEditClick={() => setIsEditing(true)}
          review={review}
          user={user}
        />
        <div
          className='opacity-30'
          style={{
            backgroundColor: 'var(--bg-color-4)',
            height: 1,
          }}
        />
      </>
    );
  }

  const authorId = levelContext?.level.archivedBy?.toString() ?? levelContext?.level.userId._id.toString();
  const isOwnLevel = authorId === user._id.toString();

  return (
    <div className='w-full reviewsSection flex flex-col gap-2 mb-2' style={{
      borderColor: 'var(--bg-color-4)',
    }}>
      <h2 className='font-bold'>{`${review ? 'Edit' : 'Add a'} review`}</h2>
      <div className='flex items-center gap-2'>
        <ProfileAvatar user={user} />
        {!isOwnLevel &&
          <Rating
            allowFraction={true}
            allowHover={true}
            // account for 4px of whitespace at the top of this component
            className='pb-1'
            emptyIcon={<Star empty={true} half={false} />}
            fillColor={'rgb(250, 204, 21)'}
            fillIcon={<Star empty={false} half={false} />}
            initialValue={rating}
            onClick={(value: number) => setRating(value)}
            size={20}
            transition
          />
        }
        {rating !== 0 &&
          <button className='italic underline text-sm' onClick={() => setRating(0)}>
            Reset
          </button>
        }
      </div>
      <ReactTextareaAutosize
        className='bg-inherit block py-1 -mt-2 w-full border-b border-neutral-500 disabled:text-neutral-500 transition resize-none placeholder:text-neutral-500 focus:outline-0 rounded-none focus:border-black focus:dark:border-white'
        disabled={isUpdating}
        onBlur={() => {
          // only prevent keydown when entering review from the sidebar
          if (!inModal) {
            setPreventKeyDownEvent(false);
          }
        }}
        onFocus={() => {
          if (!inModal) {
            setPreventKeyDownEvent(true);
          }
        }}
        onChange={(e) => setReviewBody(e.currentTarget.value)}
        placeholder='Optional review...'
        value={reviewBody}
      />
      {!(rating === 0 && reviewBody.length === 0) &&
        <div className='flex gap-2 items-center'>
          <button
            className='bg-blue-500 enabled:hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-full text-sm disabled:opacity-50 w-fit'
            disabled={isUpdating || (rating === 0 && reviewBody.length === 0)}
            onClick={() => onUpdateReview()}
          >
            Save
          </button>
          <button
            className='enabled:hover:bg-neutral-500 font-medium px-3 py-2 mr-2 rounded-full text-sm disabled:opacity-50 w-fit'
            disabled={isUpdating || (rating === 0 && reviewBody.length === 0)}
            onClick={() => {
              // restore the pre-edit user review if available, otherwise reset
              setIsEditing(!review);
              setRating(review?.score || 0);
              setReviewBody(review?.text || '');
            }}
          >
            Cancel
          </button>
          <span
            className='text-neutral-500 text-xs'
            data-tooltip-id='review-spoiler-tooltip'
            data-tooltip-content='Only visible to players that have won the level'
          >
            Use ||text|| for spoilers
          </span>
          <StyledTooltip id='review-spoiler-tooltip' />
        </div>
      }
    </div>
  );
}
