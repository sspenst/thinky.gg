import { Types } from 'mongoose';

// represents a document from the pathology.levels collection
export default interface Level {
  _id: Types.ObjectId;
  author: string;
  creatorId: Types.ObjectId;
  data: string;
  height: number;
  leastMoves: number;
  leastMovesTs: number;
  leastMovesUserId: Types.ObjectId;
  name: string;
  packId: Types.ObjectId;
  psychopathId?: number;
  width: number;
}
