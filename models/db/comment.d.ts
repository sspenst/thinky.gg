import { Types } from 'mongoose';
import User from './user';

interface Comment {
    _id: Types.ObjectId;
    author: Types.ObjectId & User;
    createdAt: Date;
    deleted: boolean;
    updatedAt: Date;
    target: Types.ObjectId;
    targetModel: User | Comment;
    text: string;

}

export default Comment;
