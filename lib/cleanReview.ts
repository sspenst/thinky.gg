import Review from '@root/models/db/review';
import User from '@root/models/db/user';

export default function cleanReview(isReqUserComplete: boolean, reqUser: User | null, review: Review) {
  const isReqUserLevel = reqUser?._id.equals(review.userId._id);

  // for levels you didn't make that you haven't completed, replace the spoiler text with ***
  if (!isReqUserLevel && !isReqUserComplete) {
    // Replace any text between || with * that are the same length. But keep the ||.
    review.text = review.text?.replace(/\|{2}[^|]+\|{2}/g, (match) => '||' + ('*'.repeat(match.length)) + '||');
  }

  return review.text;
}
