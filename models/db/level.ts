import { Types } from 'mongoose';
import User from './user';

// represents a document from the pathology.levels collection
interface Level {
  _id: Types.ObjectId;
  authorNote?: string;
  data: string;
  height: number;
  isDraft: boolean;
  leastMoves: number;
  name: string;
  points: number;
  psychopathId?: number;
  ts: number;
  userId: Types.ObjectId & User;
  width: number;
}

export default Level;
