import classNames from 'classnames';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Rating } from 'react-simple-star-rating';
import Theme from '../constants/theme';
import { AppContext } from '../contexts/appContext';
import { LevelContext } from '../contexts/levelContext';
import { PageContext } from '../contexts/pageContext';
import Review from '../models/db/review';
import FormattedReview, { Star } from './formattedReview';
import isNotFullAccountToast from './isNotFullAccountToast';
import DeleteReviewModal from './modal/deleteReviewModal';

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
          onDeleteClick={() => setIsDeleteReviewOpen(true)}
          onEditClick={() => setShowUserReview(false)}
          review={userReview}
          user={userReview.userId}
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
    <div className='block w-full reviewsSection' style={{
      borderColor: 'var(--bg-color-4)',
    }}>
      <h2 className='font-bold'>{`${userReview ? 'Edit' : 'Add a'} review`}</h2>
      <div className='flex'>
        <Rating
          allowFraction={true}
          allowHover={true}
          emptyIcon={<Star empty={true} half={false} />}
          fillColor={'rgb(250, 204, 21)'}
          fillIcon={<Star empty={false} half={false} />}
          initialValue={rating}
          onClick={(value: number) => setRating(value)}
          size={20}
          transition
        />
        {rating !== 0 &&
          <button className='text-sm italic underline mt-1 ml-1' onClick={() => setRating(0)}>
            Reset
          </button>
        }
      </div>
      <textarea
        className={classNames(
          'block p-1 my-2 w-full rounded-lg border disabled:opacity-25',
          theme === Theme.Light ?
            'bg-gray-100 focus:ring-blue-500 focus:border-blue-500 border-gray-300' :
            'bg-gray-700 border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
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
        rows={2}
        value={reviewBody}
      />
      {!(rating === 0 && reviewBody?.length === 0) &&
        <button
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold p-2 mr-2 rounded-lg text-sm focus:bg-blue-800 disabled:opacity-25'
          disabled={isUpdating || (rating === 0 && reviewBody?.length === 0)}
          onClick={() => onUpdateReview()}>
          Save
        </button>
      }
      {userReview && <button
        className='italic underline mr-2'
        onClick={() => {
          setShowUserReview(true);
          setRating(userReview?.score || 0);
          setReviewBody(userReview?.text || '');
        }}
      >
        Cancel
      </button>}
    </div>
  );
}
