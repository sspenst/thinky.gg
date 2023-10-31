import { Types } from 'mongoose';
import Level, { EnrichedLevel } from './level';
import User from './user';

interface Collection {
  _id: Types.ObjectId;
  authorNote?: string;
  createdAt: Date;
  isPrivate?: boolean;
  levels: Types.Array<Types.ObjectId & Level> | EnrichedLevel[];
  levelsPopulated?: Types.Array<Types.ObjectId & Level> | EnrichedLevel[]; // virtual
  name: string;
  slug: string;
  tags?: string[];
  type?: CollectionType;
  updatedAt: Date;
  userId: Types.ObjectId & User;

  // campaign properties:
  // levels within the collection are unlocked sequentially
  isThemed?: boolean;
  // percent of levels that must be cleared from the previous non-themed collection
  unlockPercent?: number;
}

export interface EnrichedCollection extends Collection {
  levelCount: number;
  userSolvedCount: number;
}

export interface CollectionWithLevel extends Collection {
  containsLevel: boolean;
}

export default Collection;
