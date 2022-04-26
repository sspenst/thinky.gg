import { Types } from 'mongoose';

// represents a document from the pathology.levels collection
export default interface Level {
  _id: Types.ObjectId;
  authorNote?: string;
  data: string;
  height: number;
  leastMoves: number;
  leastMovesTs: number;
  leastMovesUserId: Types.ObjectId;
  name: string;
  officialUserId?: Types.ObjectId;
  points: number;
  psychopathId?: number;
  ts: number;
  userId: Types.ObjectId;
  width: number;
  worldId: Types.ObjectId;
}
