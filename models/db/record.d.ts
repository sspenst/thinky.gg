import { Types } from 'mongoose';
import Level from './level';
import User from './user';

interface Record {
  _id: Types.ObjectId;
  isDeleted: boolean;
  gameId?: string;
  levelId: Types.ObjectId & Level;
  moves: number;
  ts: number;
  userId: Types.ObjectId & User;
}

export default Record;
