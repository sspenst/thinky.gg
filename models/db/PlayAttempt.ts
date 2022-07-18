import Level from './level';
import Stat from './stat';
import { Types } from 'mongoose';
import User from './user';

// represents a document from the pathology.levels collection
interface PlayAttempt {
  _id: Types.ObjectId;
  endTime: number;
  levelId: Types.ObjectId & Level;
  statId: Types.ObjectId & Stat;
  startTime: number;
  updateCount: number;
  userId: Types.ObjectId & User;
}

export default PlayAttempt;
