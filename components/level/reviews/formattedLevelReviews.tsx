import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../../contexts/appContext';
import { LevelContext } from '../../../contexts/levelContext';
import ReviewForm from './reviewForm';

interface FormattedLevelReviewsProps {
  hideReviews?: boolean;
  inModal?: boolean;
}

export default function FormattedLevelReviews({ inModal, hideReviews: hideOtherReviews }: FormattedLevelReviewsProps) {
  const [hideReviews, setHideReviews] = useState<boolean>();
  const levelContext = useContext(LevelContext);
  const { user } = useContext(AppContext);

  const reviewDivs = [];
  let userReview = undefined;

  useEffect(() => {
    setHideReviews(!!levelContext?.inCampaign);
  }, [levelContext?.inCampaign]);

  if (!levelContext || !levelContext.reviews) {
    return <span>Loading...</span>;
  }

  for (let i = 0; i < levelContext.reviews.length; i++) {
    const review = levelContext.reviews[i];

    if (review.userId?._id === user?._id) {
      userReview = review;
    } else {
      if (hideOtherReviews) { continue; }

      reviewDivs.push(
        <ReviewForm inModal={inModal} key={`review-${review._id.toString()}`} review={review} />
      );
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      {hideOtherReviews ? null : (<div className='font-medium text-lg'>
        {levelContext.reviews.length == 0 ?
          <>No reviews yet!</> :
          <>{levelContext.reviews.length} review{levelContext.reviews.length !== 1 && 's'}</>
        }
      </div>)}
      <ReviewForm inModal={inModal} key={`user-review-${userReview?._id.toString()}`} review={userReview} />
      {hideReviews === undefined ? null : hideReviews ?
        <div className='flex justify-center'>
          <button className='font-medium px-2 py-1 bg-neutral-200 hover:bg-white transition text-black rounded-lg border border-neutral-400 mt-2' onClick={() => setHideReviews(false)}>
            Show all reviews ({levelContext.reviews.length})
          </button>
        </div>
        :
        reviewDivs
      }
    </div>
  );
}
