import Level from './level';
import { Types } from 'mongoose';
import User from './user';

// represents a document from the pathology.reviews collection
export default interface Review {
  _id: Types.ObjectId;
  levelId: Types.ObjectId & Level;
  psychopathId?: number;
  score: number;
  text?: string;
  ts: number;
  userId: Types.ObjectId & User;
}
