import { Types } from 'mongoose';
import User from './user';

interface Comment {
  _id: Types.ObjectId;
  author: Types.ObjectId & User;
  createdAt: Date;
  deletedAt: Date;
  target: Types.ObjectId & User | Types.ObjectId & Comment | Types.ObjectId & string;
  targetModel: User | Comment | string;
  text: string;
  updatedAt: Date;
}

export interface EnrichedComment extends Comment {
  replies: EnrichedComment[];
  totalReplies: number;
}

export default Comment;
