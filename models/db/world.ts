import { Types } from 'mongoose';
import User from './user';
import Level from './level'
// represents a document from the pathology.worlds collection
export default interface World {
  _id: Types.ObjectId;
  authorNote?: string;
  levels: Types.Array<Level>;
  name: string;
  psychopathId?: number;
  userId: Types.ObjectId & User;
  
}
