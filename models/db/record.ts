import Level from './level';
import { Types } from 'mongoose';
import User from './user';

// represents a document from the pathology.records collection
export default interface Record {
  _id: Types.ObjectId;
  levelId: Types.ObjectId & Level;
  moves: number;
  ts: number;
  userId: Types.ObjectId & User;
}
