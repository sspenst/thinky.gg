import { Types } from 'mongoose';

// represents a document from the pathology.reviews collection
export default interface Review {
  _id: Types.ObjectId;
  levelId: Types.ObjectId;
  psychopathId?: number;
  score: number;
  text?: string;
  ts: number;
  userId: Types.ObjectId;
}
