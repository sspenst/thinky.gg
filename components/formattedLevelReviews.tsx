import React, { useContext, useEffect, useState } from 'react';
import AddReviewModal from './modal/addReviewModal';
import DeleteReviewModal from './modal/deleteReviewModal';
import FormattedReview from './formattedReview';
import { LevelContext } from '../contexts/levelContext';
import { PageContext } from '../contexts/pageContext';
import useHasSidebarOption from '../hooks/useHasSidebarOption';
import useUser from '../hooks/useUser';
import ReviewForm from './reviewForm';

interface FormattedLevelReviewsProps {
  levelId: string;
}

export default function FormattedLevelReviews({ levelId }: FormattedLevelReviewsProps) {
  const hasSidebarOption = useHasSidebarOption();
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [isDeleteReviewOpen, setIsDeleteReviewOpen] = useState(false);
  const levelContext = useContext(LevelContext);
  const { setIsModalOpen, showSidebar } = useContext(PageContext);
  const { user } = useUser();
  const [ showInlineReview, setShowInlineReview ] = useState(false);

  // NB: when there is no sidebar, setIsModalOpen will have been called by the dropdown component
  // when there is a sidebar, need to call setIsModalOpen here
  // TODO: https://github.com/sspenst/pathology/issues/252
  // after adding inline reviews this code can be removed
  useEffect(() => {
    if (hasSidebarOption && showSidebar) {
      setIsModalOpen(isAddReviewOpen || isDeleteReviewOpen);
    }
  }, [hasSidebarOption, isAddReviewOpen, isDeleteReviewOpen, setIsModalOpen, showSidebar]);

  const reviewDivs = [];
  let userReview = undefined;

  if (levelContext?.reviews) {
    for (let i = 0; i < levelContext.reviews.length; i++) {
      if (i !== 0) {
        reviewDivs.push(<br key={`br-${i}`}/>);
      }

      const review = levelContext.reviews[i];

      reviewDivs.push(
        <FormattedReview
          key={`formatted-review-${i}`}
          review={review}
          user={review.userId}
        />
      );

      if (review.userId._id === user?._id) {
        userReview = review;

        reviewDivs.push(
          <div key={'review-controls'}>
            <button
              className='italic underline'
              onClick={() => {
                //setIsAddReviewOpen(true)
                setShowInlineReview(true);
              }}
              style={{
                marginRight: 10,
              }}
            >
              Edit
            </button>
            <button
              className='italic underline'
              onClick={() => setIsDeleteReviewOpen(true)}
            >
              Delete
            </button>
          </div>
        );
      }
    }
  }

  return (
    <>
      {!levelContext?.reviews ? <span>Loading...</span> :
        <>
          {levelContext.level && user && (showInlineReview || !userReview) ?
            <>
              <div>
                <ReviewForm onUpdate={
                  ()=>{

                    levelContext?.getReviews();
                    setShowInlineReview(false);
                  }
                } userReview={userReview} plevel={levelContext.level} />
              </div>
              <br/>
            </>
            : null }
          {reviewDivs.length > 0 ? reviewDivs : <span>No reviews yet!</span>}
        </>}
      <AddReviewModal
        closeModal={() => {
          setIsAddReviewOpen(false);
          levelContext?.getReviews();
        }}
        isOpen={isAddReviewOpen}
        levelId={levelId}
        userReview={userReview}
      />
      <DeleteReviewModal
        closeModal={() => {
          setIsDeleteReviewOpen(false);
          levelContext?.getReviews();
        }}
        isOpen={isDeleteReviewOpen}
        levelId={levelId}
      />
    </>
  );
}
