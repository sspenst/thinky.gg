import { Types } from 'mongoose';
import User from './user';

interface Comment {
  _id: Types.ObjectId;
  author: Types.ObjectId & User;
  createdAt: Date;
  deletedAt: Date;
  target: Types.ObjectId;
  targetModel: User | Comment;
  text: string;
  updatedAt: Date;
}

export interface EnrichedComment extends Comment {
  children: EnrichedComment[];
}

export default Comment;
