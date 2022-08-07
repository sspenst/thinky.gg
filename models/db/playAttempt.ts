import { Types } from 'mongoose';
import Level from './level';
import User from './user';

// represents a document from the pathology.playattempts collection
interface PlayAttempt {
  _id: Types.ObjectId;
  attemptContext: number;
  endTime: number;
  levelId: Types.ObjectId & Level;
  startTime: number;
  updateCount: number;
  userId: Types.ObjectId & User;
}

export default PlayAttempt;
