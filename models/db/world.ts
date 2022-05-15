import Level from './level'
import { Types } from 'mongoose';
import User from './user';
import { ObjectId } from 'bson';

// represents a document from the pathology.worlds collection
export default interface World {
  _id: Types.ObjectId;
  authorNote?: string;
  levels: Types.Array<ObjectId>;
  name: string;
  psychopathId?: number;
  userId: Types.ObjectId & User;
}
