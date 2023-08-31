import classNames from 'classnames';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Rating } from 'react-simple-star-rating';
import TextareaAutosize from 'react-textarea-autosize';
import Theme from '../../constants/theme';
import { AppContext } from '../../contexts/appContext';
import { LevelContext } from '../../contexts/levelContext';
import { PageContext } from '../../contexts/pageContext';
import Review from '../../models/db/review';
import FormattedReview, { Star } from '../formatted/formattedReview';
import DeleteReviewModal from '../modal/deleteReviewModal';
import ProfileAvatar from '../profile/profileAvatar';
import isNotFullAccountToast from '../toasts/isNotFullAccountToast';

interface ReviewFormProps {
  inModal?: boolean;
  userReview?: Review;
}

export default function ReviewForm({ inModal, userReview }: ReviewFormProps) {
  const [isDeleteReviewOpen, setIsDeleteReviewOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const levelContext = useContext(LevelContext);
  const [rating, setRating] = useState(userReview?.score || 0);
  const [reviewBody, setReviewBody] = useState(userReview?.text || '');
  const { setPreventKeyDownEvent } = useContext(PageContext);
  const [showUserReview, setShowUserReview] = useState(!!userReview);
  const { theme, user } = useContext(AppContext);

  // only prevent keydown when the delete modal is the first modal open
  // (not opened from within the review modal)
  useEffect(() => {
    if (!inModal) {
      setPreventKeyDownEvent(isDeleteReviewOpen);
    }
  }, [inModal, isDeleteReviewOpen, setPreventKeyDownEvent]);

  function onUpdateReview() {
    setIsUpdating(true);

    toast.dismiss();
    toast.loading('Saving...');

    fetch('/api/review/' + levelContext?.level._id, {
      method: userReview ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        score: rating,
        text: reviewBody,
      })
    }).then(res => {
      if (res.status === 401) {
        isNotFullAccountToast('Reviewing');
      } else if (res.status !== 200) {
        throw res.text();
      } else {
        toast.dismiss();
        toast.success('Saved');

        levelContext?.getReviews();
        setShowUserReview(true);
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Error saving review');
    }).finally(() => {
      setIsUpdating(false);
    });
  }

  if (!user) {
    return null;
  }

  if (showUserReview && userReview) {
    return (
      <>
        <FormattedReview
          hideBorder={true}
          key={'user-formatted-review'}
          onEditClick={() => setShowUserReview(false)}
          review={userReview}
          user={userReview.userId}
        />
        <div
          className='opacity-30'
          style={{
            backgroundColor: 'var(--bg-color-4)',
            height: 1,
          }}
        />
        <DeleteReviewModal
          closeModal={() => {
            setIsDeleteReviewOpen(false);
            levelContext?.getReviews();
          }}
          isOpen={isDeleteReviewOpen}
        />
      </>
    );
  }

  return (
    <div className='block w-full reviewsSection flex flex-col gap-2 mb-2' style={{
      borderColor: 'var(--bg-color-4)',
    }}>
      <h2 className='font-bold'>{`${userReview ? 'Edit' : 'Add a'} review`}</h2>
      <div className='flex items-center gap-2'>
        <ProfileAvatar user={user} />
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
      </div>
      <TextareaAutosize
        className={classNames(
          'bg-inherit block py-1 -mt-2 w-full border-b border-neutral-500 disabled:text-neutral-500 transition resize-none placeholder:text-neutral-500 focus:outline-0 rounded-none',
          theme === Theme.Light ? 'focus:border-black' : 'focus:border-white',
        )}
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
        <div className='flex gap-2'>
          <button
            className='bg-blue-500 enabled:hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-full text-sm disabled:opacity-50 w-fit'
            disabled={isUpdating || (rating === 0 && reviewBody.length === 0)}
            onClick={() => onUpdateReview()}>
            Save
          </button>
          <button
            className='enabled:hover:bg-neutral-500 font-medium px-3 py-2 mr-2 rounded-full text-sm disabled:opacity-50 w-fit'
            disabled={isUpdating || (rating === 0 && reviewBody.length === 0)}
            onClick={() => {
              // restore the pre-edit user review if available, otherwise reset
              setShowUserReview(!!userReview);
              setRating(userReview?.score || 0);
              setReviewBody(userReview?.text || '');
            }}>
            Cancel
          </button>
        </div>
      }
    </div>
  );
}
