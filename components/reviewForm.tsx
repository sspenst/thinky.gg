import classNames from 'classnames';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Rating } from 'react-simple-star-rating';
import Theme from '../constants/theme';
import { LevelContext } from '../contexts/levelContext';
import { PageContext } from '../contexts/pageContext';
import useHasSidebarOption from '../hooks/useHasSidebarOption';
import useUser from '../hooks/useUser';
import Review from '../models/db/review';
import FormattedReview, { Star } from './formattedReview';
import DeleteReviewModal from './modal/deleteReviewModal';

interface ReviewFormProps {
  userReview?: Review;
}

export default function ReviewForm({ userReview }: ReviewFormProps) {
  const hasSidebarOption = useHasSidebarOption();
  const [isDeleteReviewOpen, setIsDeleteReviewOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const levelContext = useContext(LevelContext);
  const [rating, setRating] = useState(userReview?.score || 0);
  const [reviewBody, setReviewBody] = useState(userReview?.text || '');
  const { setIsModalOpen, showSidebar } = useContext(PageContext);
  const [showUserReview, setShowUserReview] = useState(!!userReview);
  const { user } = useUser();

  // NB: when there is no sidebar, setIsModalOpen will have been called by the dropdown component
  // when there is a sidebar, need to call setIsModalOpen here
  useEffect(() => {
    if (hasSidebarOption && showSidebar) {
      setIsModalOpen(isDeleteReviewOpen);
    }
  }, [hasSidebarOption, isDeleteReviewOpen, setIsModalOpen, showSidebar]);

  function onUpdateReview() {
    setIsUpdating(true);

    toast.dismiss();
    toast.loading('Saving...');

    fetch('/api/review/' + levelContext?.level?._id, {
      method: userReview ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        score: rating,
        text: reviewBody,
      })
    }).then(async(res) => {
      if (res.status !== 200) {
        toast.dismiss();
        toast.error('Error saving review');
      } else {
        toast.dismiss();
        toast.success('Saved');

        levelContext?.getReviews();
        setShowUserReview(true);
      }
    }).catch(() => {
      toast.dismiss();
      toast.error('Error saving review');
    }).finally(() => {
      setIsUpdating(false);
    });
  }

  const handleRating = (value: number) => {
    if (value === rating) {
      setRating(0);
    } else {
      setRating(value);
    }
  };

  if (!user) {
    return null;
  }

  if (showUserReview && userReview) {
    return (
      <>
        <FormattedReview
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
    <div className='border rounded-lg py-2 px-3 block w-full' style={{
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
          onClick={handleRating}
          size={20}
          transition
        />
      </div>
      <textarea
        className={classNames(
          'block p-1 my-2 w-full rounded-lg border disabled:opacity-25',
          document.body.classList.contains(Theme.Light) ?
            'bg-gray-100 focus:ring-blue-500 focus:border-blue-500 border-gray-300' :
            'bg-gray-700 border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
        )}
        disabled={isUpdating}
        onBlur={() => setIsModalOpen(false)}
        onFocus={() => setIsModalOpen(true)}
        onChange={(e) => setReviewBody(e.currentTarget.value)}
        placeholder='Optional review...'
        rows={2}
        value={reviewBody}
      />
      <button
        className='bg-blue-500 hover:bg-blue-700 text-white font-bold p-2 mr-2 rounded-lg text-sm focus:bg-blue-800 disabled:opacity-25'
        disabled={isUpdating || (rating === 0 && reviewBody?.length === 0)}
        onClick={() => onUpdateReview()}>
        Save
      </button>
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
