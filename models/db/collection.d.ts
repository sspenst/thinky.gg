import { Types } from 'mongoose';
import LevelUnlock from '../../constants/levelUnlock';
import Level, { EnrichedLevel } from './level';
import User from './user';

// represents a document from the pathology.collections collection
interface Collection {
  _id: Types.ObjectId;
  authorNote?: string;
  levels: Types.Array<Types.ObjectId & Level> | EnrichedLevel[];
  name: string;
  slug: string;
  tags?: string[];
  unlock?: LevelUnlock;
  userId?: Types.ObjectId & User;
}

export interface EnrichedCollection extends Collection {
  levelCount: number;
  userCompletedCount: number;
}

export default Collection;
