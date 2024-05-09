import Review from '@root/models/db/review';
import User from '@root/models/db/user';

export default function cleanReview({ canSee, reqUser, review }: {canSee: boolean, reqUser: User | null, review: Review}) {
  const userOwnLevel = reqUser?._id.equals(review.userId._id);

  if (!canSee && review.text && !userOwnLevel) {
    // Replace any text between || with * that are the same length. But keep the ||.
    review.text = review.text.replace(/\|{2}[^|]+\|{2}/g, (match) => '||' + ('*'.repeat(match.length)) + '||');
  }
}
