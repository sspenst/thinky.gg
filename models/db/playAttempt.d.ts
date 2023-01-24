import { Types } from 'mongoose';
import Level from './level';
import User from './user';

interface PlayAttempt {
  _id: Types.ObjectId;
  attemptContext: number;
  endTime: number;
  isDeleted: boolean;
  levelId: Types.ObjectId & Level;
  startTime: number;
  updateCount: number;
  userId: Types.ObjectId & User;
}

export default PlayAttempt;
