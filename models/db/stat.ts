import Level from './level';
import { Types } from 'mongoose';
import User from './user';

// represents a document from the pathology.stats collection
export default interface Stat {
  _id: Types.ObjectId;
  attempts: number;
  complete: boolean;
  levelId: Types.ObjectId & Level;
  moves: number;
  ts: number;
  userId: Types.ObjectId & User;
}
