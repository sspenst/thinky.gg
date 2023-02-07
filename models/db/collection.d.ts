import { Types } from 'mongoose';
import Level, { EnrichedLevel } from './level';
import User from './user';

interface Collection {
  _id: Types.ObjectId;
  authorNote?: string;
  createdAt: Date;
  // themed collections for the campaign
  isThemed?: boolean;
  levels: Types.Array<Types.ObjectId & Level> | EnrichedLevel[];
  levelsPopulated?: Types.Array<Types.ObjectId & Level> | EnrichedLevel[]; // virtual
  name: string;
  slug: string;
  tags?: string[];
  updatedAt: Date;
  userId: Types.ObjectId & User;
}

export interface EnrichedCollection extends Collection {
  levelCount: number;
  userCompletedCount: number;
}

export default Collection;
