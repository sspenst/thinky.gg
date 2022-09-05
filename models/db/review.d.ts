import { Types } from 'mongoose';
import Level, { EnrichedLevel } from './level';
import User from './user';

// represents a document from the pathology.reviews collection
interface Review {
  _id: Types.ObjectId;
  levelId: (Types.ObjectId & Level) | EnrichedLevel;
  score: number;
  text?: string;
  ts: number;
  userId: Types.ObjectId & User;
}

export default Review;
