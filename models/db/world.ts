import { Types } from 'mongoose';

// represents a document from the pathology.worlds collection
export default interface World {
  _id: Types.ObjectId;
  authorNote?: string;
  name: string;
  psychopathId?: number;
  userId: Types.ObjectId;
}
