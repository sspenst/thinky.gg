import { Types } from 'mongoose';

// represents a document from the pathology.stats collection
export default interface Stat {
  _id: Types.ObjectId;
  complete: boolean;
  levelId: Types.ObjectId;
  moves: number;
  userId: Types.ObjectId;
}
