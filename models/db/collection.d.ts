import { Types } from 'mongoose';
import Level, { EnrichedLevel } from './level';
import User from './user';

// represents a document from the pathology.collections collection
interface Collection {
  _id: Types.ObjectId;
  authorNote?: string;
  levels: Types.Array<Types.ObjectId & Level> | EnrichedLevel[];
  name: string;
  tags?: string[];
  userId?: Types.ObjectId & User;
}

export interface EnrichedCollection extends Collection {
  levelCount: number;
  userCompletedCount: number;
}

export default Collection;
