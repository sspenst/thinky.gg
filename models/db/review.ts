import { Types } from 'mongoose';
import { EnrichedLevel } from '../../pages/search';
import Level from './level';
import User from './user';

// represents a document from the pathology.reviews collection
interface Review {
  _id: Types.ObjectId;
  levelId: (Types.ObjectId & Level) | EnrichedLevel;
  psychopathId?: number;
  score: number;
  text?: string;
  ts: number;
  userId: Types.ObjectId & User;
}

export default Review;

export function cloneReview(review: Review) {
  return {
    _id: review._id,
    levelId: review.levelId,
    psychopathId: review.psychopathId,
    score: review.score,
    text: review.text,
    ts: review.ts,
    userId: review.userId,
  } as Review;
}
