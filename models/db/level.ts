import { Types } from 'mongoose';

// represents a document from the pathology.levels collection
export default interface Level {
  _id: Types.ObjectId;
  data: string;
  height: number;
  leastMoves: number;
  leastMovesTs: number;
  leastMovesUserId: Types.ObjectId;
  name: string;
  originalUserId?: Types.ObjectId;
  packId: Types.ObjectId;
  psychopathId?: number;
  userId: Types.ObjectId;
  width: number;
}
