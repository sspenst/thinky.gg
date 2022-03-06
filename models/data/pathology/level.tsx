import { Types } from 'mongoose';

// represents a document from the pathology.levels collection
export default interface Level {
  _id: Types.ObjectId;
  author: string;
  data: string;
  height: number;
  leastMoves: number;
  name: string;
  packId: Types.ObjectId;
  psychopathId: number | undefined;
  width: number;
}
