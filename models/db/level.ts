import { Types } from 'mongoose';
import User from './user';
import World from './world';

// represents a document from the pathology.levels collection
export default interface Level {
  _id: Types.ObjectId;
  authorNote?: string;
  data: string;
  height: number;
  leastMoves: number;
  name: string;
  officialUserId?: Types.ObjectId & User;
  points: number;
  psychopathId?: number;
  ts: number;
  userId: Types.ObjectId & User;
  width: number;
  worldId: Types.ObjectId & World;
}
