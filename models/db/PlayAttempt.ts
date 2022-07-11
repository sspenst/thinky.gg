import Level from './level';
import Stat from './stat';
import { Types } from 'mongoose';
import User from './user';

// represents a document from the pathology.levels collection
interface PlayAttempt {
  _id: Types.ObjectId;
  userId: Types.ObjectId & User;
  levelId: Types.ObjectId & Level;
  startTime: number;
  endTime: number;
  didWin: boolean; // true if user won the level, but unsure if this is really needed since it is tracked in statId
  statId: Types.ObjectId & Stat;
}

export default PlayAttempt;
